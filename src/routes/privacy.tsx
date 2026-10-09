import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_URL, LegalPage, Section } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — TransferWire" },
      { name: "description", content: "What TransferWire collects, why, who sees it, and how to have it removed." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <Section title="Who we are">
        <p>
          TransferWire is a free, open-source football database run by a private individual (a player), not a company.
          If you are in the EU or EEA, that person is the data controller for the data described here. To contact us
          about your data, open an issue or message us through the project page:{" "}
          <a className="text-primary underline" href={CONTACT_URL} target="_blank" rel="noopener noreferrer">
            {CONTACT_URL}
          </a>
          .
        </p>
      </Section>

      <Section title="What is public">
        <p>
          Most of the site is public on purpose. Anyone can read player profiles, club and team pages, matches,
          ratings, league tables and statistics without an account.
        </p>
        <ul>
          <li>
            Player profiles can include a name, shirt number, position, birth year, nationality, birthplace, photo,
            biography, statistics, transfers, past teams and links to highlight videos.
          </li>
          <li>
            Profiles of players under 18, or with no birth year, are kept out of search engines and our sitemap. They
            are still visible to anyone who has the link.
          </li>
        </ul>
      </Section>

      <Section title="What is private">
        <ul>
          <li>Your email address and password. Passwords are handled by our login provider and never stored in readable form.</li>
          <li>The clubs, teams and players you follow, and which alerts you have read.</li>
          <li>Your messages. Only the people in a conversation can read it.</li>
          <li>Who has blocked or reported whom.</li>
        </ul>
      </Section>

      <Section title="Accounts and messages">
        <p>
          Accounts and messages are for adults (18 and over) only, for now. Creating an account and turning on
          messages both require you to confirm your age. We do not check ID, so we rely on that confirmation.
        </p>
        <p>
          Messages to a player or club are delivered to the adult who manages that page. If you report a message, we
          keep a copy of it and your reason so an administrator can review it. Messages cannot be edited or deleted by
          users.
        </p>
      </Section>

      <Section title="Who handles your data for us">
        <ul>
          <li>Supabase: database, login and file storage.</li>
          <li>Cloudflare: hosting and delivery. Like any web host, it sees your IP address and the pages you request.</li>
          <li>Google: only if you choose &quot;Continue with Google&quot;. We also load our fonts from Google Fonts, which means your browser contacts Google when a page loads.</li>
        </ul>
        <p>We do not use advertising, tracking pixels or analytics cookies, and we do not sell data.</p>
      </Section>

      <Section title="Data from other sources">
        <p>
          Fixtures, results, league tables, club names and crests may come from public sources such as Everysport and
          school sports sites. They belong to their owners, and we show them to help people find football information.
          If you own something shown here and want it changed or removed, contact us.
        </p>
      </Section>

      <Section title="What is stored in your browser">
        <p>
          Your login session, your light or dark choice, and a small flag that stops the logo intro replaying are
          stored in your browser. The site also saves its own files so it can be installed as an app. None of this is
          used for tracking.
        </p>
      </Section>

      <Section title="Why we use it, and how long we keep it">
        <p>
          We use your data to run the site: showing profiles, letting you manage what you add, sending you alerts and
          messages, and keeping the community safe. In EU terms, we rely on your consent (for content you add and your
          account) and on our legitimate interest in running and protecting the site. We keep data while your account or
          the profile exists and delete it when you ask or when it is no longer needed, except reports we need to keep
          for safety.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask to see, correct, export or delete your data, to object to how it is used, or to have a profile
          about you removed. Parents and guardians can ask for the removal of a profile about a young player. Contact us
          using the link above and we will reply within 30 days. You can also complain to your national data
          protection authority.
        </p>
      </Section>

      <Section title="Children">
        <p>
          We do not knowingly allow anyone under 18 to hold an account or send messages. Some player profiles are about
          young players and are managed by adults. If you manage such a profile, you must have permission from the
          player and, where needed, their parent or guardian. If you believe a profile should not be here, tell us and
          we will remove it.
        </p>
      </Section>

      <Section title="Changes">
        <p>We may update this policy. The date at the top shows the latest version.</p>
      </Section>
    </LegalPage>
  );
}
