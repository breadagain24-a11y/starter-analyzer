import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { Badge } from '../components/ui'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <Nav />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16 flex-1">
        <Badge className="mb-4">Legal</Badge>
        <h1 className="text-3xl font-black tracking-tighter mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-8">Last updated: May 2026</p>
        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">Data We Collect</h2>
            <p>We collect your email address, name, starter photos you upload, and questionnaire answers you provide during analyses.</p>
          </section>
          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">How AI Processes Your Data</h2>
            <p>Photos and questionnaire data are sent to Anthropic's Claude API for analysis. Anthropic's data policy applies to this processing. We do not use your data to train AI models. See <a href="https://www.anthropic.com/privacy" className="text-[#D69A3A] underline">Anthropic's Privacy Policy</a> for details.</p>
          </section>
          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">Data Retention</h2>
            <p>Photos are processed and stored securely for the duration of your subscription. Analyses are retained while your account is active. You can delete all your data at any time via Settings → Delete Account.</p>
          </section>
          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">Your Rights (GDPR)</h2>
            <p>If you are in the EU, you have the right to access, correct, and delete your personal data. Contact us at bread.again24@gmail.com to exercise these rights.</p>
          </section>
          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">Contact</h2>
            <p>For privacy questions: <a href="mailto:bread.again24@gmail.com" className="text-[#D69A3A] underline">bread.again24@gmail.com</a></p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
