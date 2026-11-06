# Five-feature pilot rollout — 5 November 2026

**Private QA candidate:** v1.0.56. The five customer AI Feature tiles are:
Ice Calculator, Rate Card, FAQ/Safety, Support, and Service Area search.
The existing AI Video bottom tab remains independently available; the other
nine of fourteen modules stay in source, but hidden for pilot customers until
the owner publishes a validated feature manifest. Owner-only tools remain
subject to role permissions and backend policy.

**1. Calculator:** real dry-ice estimator and editable duration/machines/transit
inputs; min/max warning, approximate cost, one-tap navigation to the original
Home booking form carrying KG through sessionStorage; no auto-submission.

**2. Rates:** existing rate subscription; dry ice, thermocol and configured
transport with no claim of final price. Actual order total remains in booking.

**3. FAQ:** bilingual safety, insulated gloves, CO2 ventilation, never airtight,
confirmation and outstation/bus-delivery limitations.

**4. Support:** separate verified Call and WhatsApp links, safe prefilled
support text without automatically sending private order data.

**5. Service Area:** UP district search, result count, and explicit notice that
listed places are enquiries, not confirmed deliveries.

## Updating existing pilot phones in stages
The v1.0.56 app reads only
https://ankurdryice.store/app-updates/pilot-features.json
with no-store, omitted credentials, redirect rejection and max 4096 bytes.
It rechecks on opening, focus and at five-minute intervals. On network or
manifest failure only the five built-in approved tools remain visible.
Host a JSON document on the canonical HTTPS site, for example:

```json
{
  "schemaVersion": 1,
  "channel": "pilot",
  "minVersionCode": 56,
  "enabledFeatureIds": ["calculator", "rates", "faq", "support", "service-area"]
}
```

Add only 3–4 reviewed IDs per subsequent batch and republish the same JSON.
Serve application/json, Cache-Control: no-store, and CORS allowing the actual
Android Capacitor/WebView origin. Test with installed v1.0.56 pilot phones:
unpublished or invalid remote JSON must NOT reveal unfinished features.

**No website manifest was published by GitHub.** Existing v1.0.55 handsets
must update to signed v1.0.56 first. Remote display flags cannot grant
permissions or activate unconfigured server-backed financial workflows.
Further batches require deployed App Check/Rules/callables and owner policy
approval before switching them on.

**Not completed by code:** live Firebase cutover, hosted JSON endpoint,
physical Android multi-user testing, public APK/Play distribution.
