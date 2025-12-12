# Security Rules System

## POC

Compute service: MPo2eiCmac5m4YUkBJoky4

VCL service: SQnQlsK26fQrakQ9eg1hY5

## Architecture

The system consists of three main components:

1. **Compute Service (Rust)**: 
   - Handles initial request processing
   - Evaluates security rules
   - Adds authentication headers before forwarding to origin
   - Adds Edge-Auth header containing:
     - Current Unix timestamp
     - Fastly POP identifier
     - HMAC-SHA256 signature

2. **Customer VCL Service**:
   - Only requires two additions to existing VCL setup:
     1. A dictionary named `secrets` containing the shared secret:
        ```vcl
        table secrets {
            "secret_key": "your-shared-secret-here"
        }
        ```
     2. A VCL snippet set with highest priority for auth validation:
        - Validates authentication headers from compute service
        - Verifies request timestamp is within 5 seconds
        - Validates HMAC signature using shared secret
        - Returns 403 if validation fails

3. **Origin Server**:
   - Handles authenticated requests
   - Never receives direct traffic

### Security Flow

1. Client makes request to compute service
2. Compute service:
   - Evaluates security rules (WAF)
   - If request is allowed:
     - Generates Unix timestamp
     - Creates HMAC signature using: timestamp + POP identifier
     - Adds a single Edge-Auth header with format:
       timestamp,pop,signature
       where:
       - timestamp: Current Unix timestamp
       - pop: Fastly Point of Presence identifier
       - signature: HMAC-SHA256(timestamp + pop)
     - Forwards to VCL layer

3. Customer VCL:
   - Using high-priority snippet, validates:
     - Edge-Auth header exists and is properly formatted
     - Timestamp component is within acceptable window
     - HMAC signature is valid using shared secret
   - If valid, forwards to origin
   - If invalid, returns 403

This architecture ensures:
- Origin only receives requests via compute service
- Requests can't be replayed after 5 seconds
- Each request's signature is unique to its timestamp and POP location
- Minimal changes required to customer VCL setup
- Simple shared secret management via VCL dictionary


## Rule Structure

Each rule consists of three main components:
1. `enabled` - boolean flag to enable/disable the rule
2. `conditions` - the criteria for when the rule should trigger
3. `action` - what happens when the rule matches

Basic example:
```json
{
  "enabled": true,
  "conditions": {
    "operator": "and",
    "rules": [
      {
        "type": "path",
        "operator": "startswith",
        "value": "/admin"
      }
    ]
  },
  "action": {
    "type": "block",
    "response_code": 403,
    "response_message": "Access denied"
  }
}
```

## Condition Types

### Path Conditions
Matches against the request path.

```json
{
  "type": "path",
  "operator": "startswith|equals|contains|matches",
  "value": "/path/to/match"
}
```
- `startswith`: Path begins with value
- `equals`: Exact path match
- `contains`: Path contains value
- `matches`: Path matches regex pattern

### IP Conditions
Matches against client IP address.

```json
{
  "type": "ip",
  "operator": "equals|inrange",
  "value": ["192.168.1.1", "10.0.0.0/8"]
}
```
- `equals`: IP exactly matches one in list
- `inrange`: IP falls within any CIDR range in list

### Device Conditions
Matches against device type using user agent detection.

```json
{
  "type": "device",
  "operator": "is|isnot",
  "value": "mobile|tablet|desktop"
}
```
- `is`: Device matches specified type
- `isnot`: Device does not match specified type

### User Agent Conditions
Matches against the User-Agent header.

```json
{
  "type": "useragent",
  "operator": "equals|startswith|contains|matches",
  "value": "Mozilla/5.0"
}
```
- `equals`: Exact user agent match
- `startswith`: User agent begins with value
- `contains`: User agent contains value
- `matches`: User agent matches regex pattern

### Header Conditions
Checks for presence or value of headers.

```json
{
  "type": "header",
  "key": "X-Custom-Header",
  "operator": "exists|notexists|equals|contains"
}
```
- `exists`: Header is present
- `notexists`: Header is not present
- `equals`: Header value exactly matches key
- `contains`: Header value contains key

### Rate Limit Conditions
Enforces request rate limits per client IP with penalty box functionality.

```json
{
  "type": "ratelimit",
  "window": "1m",
  "max_requests": 100,
  "block_ttl": 300,
  "counter_name": "optional_custom_counter_name",
  "penaltybox_name": "optional_custom_penaltybox_name"
}
```

Fields:
- `window`: Time window for rate counting (e.g., "1m", "5m", "1h")
- `max_requests`: Maximum allowed requests in the window
- `block_ttl`: How long (in seconds) to block IPs that exceed the limit
- `counter_name`: (Optional) Custom name for the rate counter
- `penaltybox_name`: (Optional) Custom name for the penalty box

When a client exceeds the rate limit:
1. They are added to a penalty box for the specified TTL
2. All requests from that IP are blocked during the penalty period

## Condition Operators

Conditions can be combined using logical operators:

- `and`: All conditions must match
- `or`: Any condition must match
- `not`: No conditions should match

Example combining conditions:
```json
{
  "operator": "and",
  "rules": [
    {
      "type": "path",
      "operator": "startswith",
      "value": "/api"
    },
    {
      "operator": "or",
      "rules": [
        {
          "type": "device",
          "operator": "is",
          "value": "mobile"
        },
        {
          "type": "device",
          "operator": "is",
          "value": "tablet"
        }
      ]
    }
  ]
}
```

## Actions

When a rule matches, it can trigger one of these actions:

```json
{
  "type": "block|challenge",
  "response_code": 403,
  "response_message": "Custom message",
  "challenge_type": "captcha"
}
```

Fields:
- `type`: The action to take (`block` or `challenge`)
- `response_code`: HTTP status code to return (optional)
- `response_message`: Custom message to return (optional)
- `challenge_type`: Type of challenge to present (optional)

## Complete Example

Here's a complete example that blocks access to the admin area from mobile devices:

```json
{
  "block_admin_mobile": {
    "enabled": true,
    "conditions": {
      "operator": "and",
      "rules": [
        {
          "type": "path",
          "operator": "startswith",
          "value": "/admin"
        },
        {
          "type": "device",
          "operator": "is",
          "value": "mobile"
        }
      ]
    },
    "action": {
      "type": "block",
      "response_code": 403,
      "response_message": "Admin access not allowed from mobile devices"
    }
  }
}
```

This rule will:
1. Check if the request path starts with "/admin"
2. Check if the request is from a mobile device
3. If both conditions are true, block the request with a 403 status and custom message
