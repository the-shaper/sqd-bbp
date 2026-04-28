# Repository Guidance

- This application is intended to be handed off to a customer.
- Build for takeover: favor clear boundaries, simple configuration, and documentation over tightly coupled shortcuts.
- Even when a final integration is not implemented yet, leave the necessary seams so the next owner can plug in their own provider with minimal rewiring.
- Prioritize seam-based architecture around AI providers, authentication, document ingestion/storage, and media/video services.
- Avoid hardcoded vendor assumptions in product logic. Prefer interfaces, adapters, env-based configuration, and isolated integration modules.
- Choose changes that keep the app easy to understand, maintain, and extend by a different engineer or team after handoff.
