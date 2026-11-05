// Serializes structured data for an inline <script type="application/ld+json">.
//
// JSON.stringify does not escape "<", so a value such as `</script><script>...`
// inside any field would end the script element early and run as page script.
// Replacing every "<" with its JSON escape (the six characters \u003c) keeps the output
// inside the element, and a JSON parser (a search engine's included) reads it back as the
// original "<", so the structured data is unchanged.
//
// Use this for every JSON-LD block that contains a value an agent, a visitor or
// the database supplies (listing text, addresses, city names, agent details).
export function serializeJsonLd(data: unknown): string {
  const json = JSON.stringify(data) ?? "null";
  return json.replace(/</g, "\\u003c");
}
