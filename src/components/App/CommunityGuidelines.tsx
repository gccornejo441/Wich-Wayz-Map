import {
  MODERATION_ACTIONS,
  MODERATOR_OUTCOMES,
  REPORT_REASON_ACTION_MAP,
  REPORT_REASON_DEFINITIONS,
  REPORT_REASON_ORDER,
} from "@constants/moderationPolicy";

const CommunityGuidelines = () => {
  return (
    <main role="main" className="mt-8">
      <div id="inner-content">
        <article className="max-w-3xl mx-auto py-8 md:py-12 px-4 lg:px-0 lg:pb-32">
          <h1 className="text-3xl md:text-5xl lg:text-6xl leading-none mb-6 lg:mb-8 text-primary dark:text-brand-secondary">
            Community Guidelines
          </h1>
          <div className="mb-2 text-gray-400 dark:text-gray-500 flex justify-between">
            <time dateTime="2026-02-09">Last updated on February 9, 2026</time>
          </div>

          <section className="prose lg:prose-xl text-gray-900 dark:text-text-inverted dark:prose-invert pt-5 prose-h1:text-red prose-h2:text-red prose-h3:text-red prose-strong:text-red">
            <p>
              Wich Wayz exists to help people discover real sandwich spots. Use
              these guidelines when adding, editing, and reporting shops.
            </p>

            <h2 id="policy-scope" tabIndex={-1}>
              Policy Scope
            </h2>
            <p>
              These guidelines apply to all community contributions, including:
            </p>
            <ul>
              <li>Shop submissions and edits</li>
              <li>Location updates and closure reports</li>
              <li>Duplicate and spam reports</li>
              <li>Any metadata shown publicly on listings</li>
            </ul>

            <h2 id="expected-behavior" tabIndex={-1}>
              Expected Behavior
            </h2>
            <ul>
              <li>Submit accurate and verifiable shop information.</li>
              <li>Report issues in good faith with specific details.</li>
              <li>
                Avoid duplicate entries when a shop already exists on the map.
              </li>
            </ul>

            <h2 id="not-allowed" tabIndex={-1}>
              Not Allowed
            </h2>
            <ul>
              <li>Spam, fake listings, or promotional abuse.</li>
              <li>Intentionally incorrect location details.</li>
              <li>Repeated duplicate submissions for the same shop.</li>
            </ul>

            <h2 id="report-reasons" tabIndex={-1}>
              Report Reasons and Default Moderator Outcomes
            </h2>
            <p>
              Reports must use one of the exact reasons below. When confirmed,
              moderators apply the mapped actions.
            </p>

            <div className="not-prose overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-surface-darker text-gray-700 dark:text-text-inverted">
                  <tr>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Use When</th>
                    <th className="px-4 py-3">Default Outcome</th>
                    <th className="px-4 py-3">Mapped Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {REPORT_REASON_ORDER.map((reason) => {
                    const reasonDefinition = REPORT_REASON_DEFINITIONS[reason];
                    const moderatorOutcome =
                      MODERATOR_OUTCOMES[reasonDefinition.moderatorOutcome];
                    const mappedActions = REPORT_REASON_ACTION_MAP[reason]
                      .map((action) => MODERATION_ACTIONS[action].label)
                      .join(", ");

                    return (
                      <tr
                        key={reason}
                        className="border-t border-gray-200 dark:border-gray-700"
                      >
                        <td className="px-4 py-3 font-semibold">
                          {reasonDefinition.label}
                        </td>
                        <td className="px-4 py-3">
                          {reasonDefinition.description}
                        </td>
                        <td className="px-4 py-3">{moderatorOutcome.label}</td>
                        <td className="px-4 py-3">{mappedActions}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h2 id="outcome-definitions" tabIndex={-1}>
              Moderator Outcome Definitions
            </h2>
            <ul>
              {Object.values(MODERATOR_OUTCOMES).map((outcome) => (
                <li key={outcome.label}>
                  <strong>{outcome.label}:</strong> {outcome.description}
                </li>
              ))}
            </ul>

            <h2 id="reason-action-map" tabIndex={-1}>
              Reason to Action Map
            </h2>
            <ul>
              <li>
                <strong>spam</strong> - hide shop, unlist shop
              </li>
              <li>
                <strong>wrong_location</strong> - update location data
              </li>
              <li>
                <strong>closed</strong> - update location status
              </li>
              <li>
                <strong>duplicate</strong> - mark canonical shop, hide duplicate
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
};

export default CommunityGuidelines;
