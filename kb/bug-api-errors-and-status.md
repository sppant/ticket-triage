# API errors and service status

If your integration receives HTTP 500 or 503 errors from our API, check the status page first; it lists active incidents and updates every 15 minutes.

When there is no incident, retry with exponential backoff, and confirm your API key and the request payload; malformed payloads return 400, not 500. Send us the request ID from the response headers, the timestamp and the endpoint, and we will look at the logs.

An outage that fails production traffic is our highest priority. Customers on the business plan can also call the emergency line listed in their contract.
