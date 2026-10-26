import { useSite } from '../SiteContext'
  
export default function Terms() {
  const { supportEmail } = useSite()
  return (
    <div className="doc">
      <h1>Terms of use</h1>
      <p className="doc-date">Last updated: October 2026</p>

      <p>
        UniMart helps students buy and sell items with each other. By creating an
        account or using the site, you agree to these terms.
      </p>

      <h2>What we do (and don't do)</h2>
      <p>
        We only connect buyers and sellers. We don't handle payments, deliver items, check
        items, or take part in any deal. Every deal is between the buyer and the seller, so use
        your own judgment and look after your own money and safety.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give true details, including a WhatsApp number that belongs to you.</li>
        <li>Keep your password private. You are responsible for what happens on your account.</li>
        <li>Use one account per person.</li>
      </ul>

      <h2>What you can post</h2>
      <p>Post only items you really own and are free to sell, with honest photos and descriptions. Do not post:</p>
      <ul>
        <li>stolen, fake or counterfeit goods;</li>
        <li>illegal items, drugs, weapons or anything dangerous;</li>
        <li>adult content, or photos of other people without their permission;</li>
        <li>spam, scams, or listings meant to mislead buyers.</li>
      </ul>
      <p>You keep the rights to your photos, and you allow us to show them on the site.</p>

      <h2>Meeting and paying safely</h2>
      <ul>
        <li>Meet in a public place on campus, in daylight if you can.</li>
        <li>Check the item before you pay, and don't pay in advance.</li>
        <li>Be careful with anyone who rushes you or asks for money first.</li>
      </ul>

      <h2>Removing content and accounts</h2>
      <p>
        We may remove listings or close accounts that break these terms or put other students at
        risk, without notice.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If you keep using the site after a change, you accept it.</p>

            <h2>Contact</h2>
      <p>
        Questions, or want to report a problem? Email{' '}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </p>
    </div>
  )
}
