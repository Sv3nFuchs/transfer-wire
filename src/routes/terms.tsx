import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_URL, LegalPage, Section } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of use — TransferWire" },
      { name: "description", content: "The rules for using TransferWire, adding profiles and sending messages." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <Section title="Using the site">
        <p>
          TransferWire is a free, community-built football database. You can browse it without an account. By creating
          an account or using messages, you agree to these terms and to our privacy policy.
        </p>
      </Section>

      <Section title="Adults only, for now">
        <p>
          You must be 18 or older to create an account or use messages. If you are younger, you can still read the
          public pages. Do not create an account for someone else, and do not use anyone else&apos;s account.
        </p>
      </Section>

      <Section title="What you add">
        <ul>
          <li>Only add information that is true and that you are allowed to share.</li>
          <li>
            Only create a profile about another person if you have their permission. For a player under 18, you also
            need permission from a parent or guardian.
          </li>
          <li>Only upload photos you took or have the right to use, and that the people in them are happy to share.</li>
          <li>No impersonation, false statistics, hate, harassment, threats, sexual content or anything illegal.</li>
        </ul>
        <p>
          You keep ownership of what you add. By adding it, you let TransferWire show it publicly on the site and keep
          it while it is relevant. Club crests and data from other websites belong to their owners.
        </p>
      </Section>

      <Section title="Messages">
        <ul>
          <li>Be respectful and keep it about football. No spam, pressure, or requests for money.</li>
          <li>Never ask for or share passwords, bank details or private information about other people.</li>
          <li>
            Never try to contact a child or young person outside the rules of this site, or encourage them to move a
            conversation somewhere private.
          </li>
          <li>You can block and report anyone. We may remove messages and accounts that break these rules.</li>
        </ul>
      </Section>

      <Section title="Removing content and accounts">
        <p>
          We may remove content, profiles or accounts that break these terms or that someone has reasonably asked us to
          take down, with or without notice. If you think something here is wrong or should not be public, tell us
          through{" "}
          <a className="text-primary underline" href={CONTACT_URL} target="_blank" rel="noopener noreferrer">
            the project page
          </a>{" "}
          and we will look at it quickly.
        </p>
      </Section>

      <Section title="No guarantees">
        <p>
          The site is provided as it is. Ratings, statistics and results can be wrong or out of date, and we cannot
          promise the site will always be available. To the extent the law allows, we are not responsible for losses
          caused by using the site or by what other people post.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may change these terms as the site grows. Using the site after a change means you accept it. The date at
          the top shows the latest version.
        </p>
      </Section>
    </LegalPage>
  );
}
