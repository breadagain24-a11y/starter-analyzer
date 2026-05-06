import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { Badge } from '../components/ui'

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <Nav />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16 flex-1">
        <Badge className="mb-4">Legal</Badge>
        <h1 className="text-3xl font-black tracking-tighter mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-8">Last updated: May 2026</p>
        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">Informational Use Only</h2>
            <p>The Breadagain Starter Analyzer provides informational analysis only. It is not a substitute for professional food safety advice. If you suspect serious contamination, consult a food safety resource.</p>
          </section>
          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">Subscription Terms</h2>
            <p>Pro plans are billed monthly or annually. You may cancel at any time; access continues until the end of your billing period. We offer a 7-day money-back guarantee with no questions asked.</p>
          </section>
          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">Acceptable Use</h2>
            <p>You agree not to misuse the service, attempt to access other users' data, or use the API in ways that violate our terms or Anthropic's usage policies.</p>
          </section>
          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">Contact</h2>
            <p><a href="mailto:bread.again24@gmail.com" className="text-[#D69A3A] underline">bread.again24@gmail.com</a></p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
