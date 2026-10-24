export default function Privacy() {
  return (
    <div className="doc">
      <h1>Privacy</h1>
      <p className="doc-date">Last updated: October 2026</p>

      <p>This page explains what UniMart keeps about you and who can see it.</p>

      <h2>What we keep</h2>
      <ul>
        <li>Your name, email address, university and WhatsApp number.</li>
        <li>Your password, stored only as a scrambled version that we can't read back.</li>
        <li>The listings you post, including their text and photos.</li>
      </ul>

      <h2>Who can see it</h2>
      <ul>
        <li>
          <strong>Logged-in students</strong> can see your listings, your name and your university.
        </li>
        <li>
          <strong>Your WhatsApp number</strong> is used so buyers can message you. A logged-in
          student who opens your listing can contact you on WhatsApp, and when they message you,
          you will see their number too.
        </li>
        <li>
          Your email address and password are never shown to other users.
        </li>
        <li>
          Listing photos can be opened by anyone who has the exact link to the photo, even though
          the links are not listed publicly.
        </li>
      </ul>

      <h2>What we don't do</h2>
      <p>We don't sell your details, and we don't show ads or use tracking cookies.</p>

      <h2>How the site stores things on your device</h2>
      <p>
        When you log in, the site saves a login token in your browser so you stay logged in for a
        few days. Logging out removes it. You can also log out of all other devices from your
        profile page, and changing your password does the same.
      </p>

      <h2>Other services</h2>
      <ul>
        <li>
          When you tap <em>Contact seller</em>, WhatsApp opens, and WhatsApp's own privacy rules
          apply to the conversation.
        </li>
        <li>The site loads its text font from Google Fonts.</li>
        <li>The site is run on a hosting provider, which stores the data described above.</li>
      </ul>

      <h2>Your choices</h2>
      <p>
        You can delete any of your listings, and its photos, at any time from the My listings
        page. Deleting a whole account is not built into the site yet.
      </p>
    </div>
  )
}
