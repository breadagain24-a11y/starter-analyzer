import { useState, FormEvent } from 'react'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { Badge, Button, Card } from '../components/ui'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <Nav />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-16 flex-1 w-full">
        <Badge className="mb-4">Get in touch</Badge>
        <h1 className="text-3xl font-black tracking-tighter mb-2">Contact</h1>
        <p className="text-gray-400 text-sm mb-8">Built by Tjard, keeper of a 4-year-old Black Death lineage starter. I read every message.</p>
        {sent ? (
          <Card className="p-8 text-center">
            <div className="text-3xl mb-3">🍞</div>
            <h2 className="font-black text-xl mb-2">Message sent!</h2>
            <p className="text-gray-500 text-sm">I'll get back to you within 24–48h.</p>
          </Card>
        ) : (
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A]" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A]" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Message</label>
                <textarea required value={message} onChange={e => setMessage(e.target.value)} rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] resize-none" placeholder="What's on your mind?" />
              </div>
              <Button type="submit" className="w-full">Send Message →</Button>
            </form>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  )
}
