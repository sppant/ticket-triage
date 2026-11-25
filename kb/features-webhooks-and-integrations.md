# Webhooks and integrations

Webhooks are available for item created and item deleted events under Settings, Integrations, Webhooks. Each delivery is signed so you can verify it, and failed deliveries are retried for 24 hours.

A webhook for status changes is on our roadmap. In the meantime, you can poll the changes endpoint of the API every minute to sync status with your own system.

For other tools we offer native integrations and a REST API; see the developer documentation for authentication and rate limits.
