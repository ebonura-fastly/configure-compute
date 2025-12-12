#!/bin/bash

# Function to make a request and show status code
make_request() {
    status=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:7676/resources)
    echo "Response status: $status"
}

echo "Making 7 requests quickly (rate limit is 5 per 10s)..."
for i in {1..7}; do
    echo "Request $i"
    make_request
    # No sleep between requests to test rate limit properly
done

echo "Rate limit should be exceeded and requests blocked for 1 second..."
sleep 0.2

echo "Making another request (should be blocked)..."
make_request

echo "Waiting for block to expire (1 second)..."
sleep 1.5

echo "Making final request (should succeed)..."
make_request
