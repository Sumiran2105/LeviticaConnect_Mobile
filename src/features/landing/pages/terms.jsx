import {
  User,
  CreditCard,
  ShieldAlert,
  Scale,
  Info,
  Lock,
  Users,
  Mail
} from "lucide-react";
import { Header } from "./landing/header";
import { Footer } from "./landing/footer";

export function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 selection:bg-indigo-100">
      <Header />


      <main className="mx-auto max-w-5xl px-4 pb-14 pt-28 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 sm:p-8 md:p-12 space-y-10">


          <div className="mx-auto max-w-3xl text-center border-b border-slate-100 pb-8 space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Terms & Conditions</h1>
            <p className="text-sm font-semibold text-slate-400">Last updated: October 19, 2024</p>
            <div className="w-12 h-1 bg-indigo-600 mx-auto rounded-full mt-4" />
          </div>


          <div className="p-5 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl flex gap-3.5 items-start">
            <Info className="size-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm sm:text-base leading-relaxed text-indigo-950 font-medium">
              Welcome to <span className="font-bold text-indigo-900">Levitica Technologies</span> (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, &quot;us&quot;). By accessing or using our collaboration workspace platform, website <span className="text-indigo-600 underline">https://leviticatechnologies.com</span>, and Levitica Connect services, you (&quot;User&quot;, &quot;you&quot;, &quot;your&quot;) agree to be bound by these Terms and Conditions.
            </p>
          </div>


          <section className="space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              By accessing, browsing, registering for, or using our workspace and real-time collaboration services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree with any part of these Terms, you must not use our services.
            </p>
          </section>


          <section className="space-y-6">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">2. Eligibility and Account Registration</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


              <div className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0 self-start">
                  <User className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Age Requirement</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">You must be at least 18 years old to create a workspace account. By using our services, you warrant that you meet this age requirement.</p>
                </div>
              </div>


              <div className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0 self-start">
                  <User className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Account Accuracy</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.</p>
                </div>
              </div>


              <div className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0 self-start">
                  <Lock className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Account Security</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your workspace account.</p>
                </div>
              </div>


              <div className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl flex-shrink-0 self-start">
                  <Users className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">One Account Per User</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Each user may maintain only one account. Sharing personal account credentials or creating multiple accounts to bypass restrictions is strictly prohibited.</p>
                </div>
              </div>

            </div>
          </section>


          <section className="space-y-6">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">3. Services and Payments</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="p-5 border border-slate-100 rounded-2xl flex gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0 self-start">
                  <CreditCard className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Payment Processing</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">All payments are processed securely via Razorpay. You agree to provide valid, complete, and current billing information.</p>
                </div>
              </div>

              <div className="p-5 border border-slate-100 rounded-2xl flex gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0 self-start">
                  <CreditCard className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Subscription Terms</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Subscription fees are billed in advance on a recurring basis. You may cancel your subscription or downgrade at any time.</p>
                </div>
              </div>

              <div className="p-5 border border-slate-100 rounded-2xl flex gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl flex-shrink-0 self-start">
                  <ShieldAlert className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Payment Failures</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Failed payments may result in immediate suspension of your workspace collaboration features. Repeated failures may lead to account closure.</p>
                </div>
              </div>

              <div className="p-5 border border-slate-100 rounded-2xl flex gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0 self-start">
                  <Scale className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Taxes</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">All fees are exclusive of applicable taxes, which will be added to your invoice where required by local tax legislation.</p>
                </div>
              </div>

            </div>
          </section>


          <section className="space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">4. Intellectual Property Rights</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              All content provided through our services, including but not limited to collaboration tools, custom interfaces, graphics, brand logos, and proprietary software, is the property of Levitica Technologies or our licensors, and is protected by copyright and intellectual property laws.
            </p>
            <div className="space-y-3.5 pl-4 pt-2">
              <div className="text-sm text-slate-600 font-medium">
                <span className="font-bold text-slate-800">• License Grant:</span> We grant you a limited, non-exclusive, non-transferable license to access and use the Levitica Connect service for internal business communications and team collaboration.
              </div>
              <div className="text-sm text-slate-600 font-medium">
                <span className="font-bold text-slate-800">• Restrictions:</span> You may not reverse engineer, copy, distribute, modify, lease, sell, or create derivative works from any software code or structural interface of our services.
              </div>
              <div className="text-sm text-slate-600 font-medium">
                <span className="font-bold text-slate-800">• User Content:</span> By submitting messaging content, files, or media to your workspace, you warrant that you own or have permission to share that content. You grant us a worldwide, royalty-free license to host, transmit, and render your content solely for the purpose of operating the collaboration services.
              </div>
              <div className="text-sm text-slate-600 font-medium">
                <span className="font-bold text-slate-800">• Enforcement:</span> We will pursue legal action against any unauthorized use, scraping, or breach of our intellectual property assets.
              </div>
            </div>
          </section>


          <section className="space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">5. User Conduct and Responsibilities</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-indigo-500" /> No Unauthorized Access
                </h4>
                <p className="text-xs font-semibold text-slate-400 leading-relaxed">Do not share your workspace credentials or allow unauthorized users to access your organization&apos;s private communication spaces.</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-indigo-500" /> Respectful Communication
                </h4>
                <p className="text-xs font-semibold text-slate-400 leading-relaxed">Maintain professional and respectful communication in all chat channels, message boards, and video meetings.</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-indigo-500" /> Security Safeguards
                </h4>
                <p className="text-xs font-semibold text-slate-400 leading-relaxed">Do not attempt to bypass security measures, scan for workspace vulnerabilities, or upload malicious files to shared libraries.</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-indigo-500" /> No Impersonation
                </h4>
                <p className="text-xs font-semibold text-slate-400 leading-relaxed">Do not impersonate other team members, administrators, or entities, or falsify authorizations within the workspace.</p>
              </div>
            </div>
          </section>


          <section className="space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">6. Limitation of Liability</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              To the fullest extent permitted by applicable law, Levitica Technologies shall not be liable for:
            </p>
            <ul className="space-y-2 pl-4 text-sm font-semibold text-slate-500 list-disc">
              <li>Any indirect, incidental, special, consequential, or punitive damages.</li>
              <li>Loss of profits, revenue, data, use, goodwill, or other intangible business losses.</li>
              <li>Payment gateway failures, technical network failures, or cloud service interruptions beyond our control.</li>
              <li>Any errors or omissions in user-uploaded files, shared documents, or transcriptions.</li>
              <li>Any unauthorized access, loss, or leakage of organization data resulting from user credential compromise or phishing.</li>
            </ul>
          </section>


          <section className="space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">7. Termination</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              We may terminate or suspend your account and access to our collaboration services immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to access the workspace, retrieve files, or join channels will cease immediately. All provisions of these Terms which by their nature should survive termination shall survive.
            </p>
          </section>


          <section className="space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">8. Governing Law and Dispute Resolution</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
            </p>
            <div className="space-y-2.5 pl-4">
              <div className="text-sm text-slate-500 font-semibold">
                <span className="font-bold text-slate-700">• Jurisdiction:</span> Any dispute arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in Hyderabad, Telangana, India.
              </div>
              <div className="text-sm text-slate-500 font-semibold">
                <span className="font-bold text-slate-700">• Informal Resolution:</span> We strongly encourage you to contact us first at info@leviticatechnologies.com to resolve any workspace disputes amicably before initiating formal legal proceedings.
              </div>
              <div className="text-sm text-slate-500 font-semibold">
                <span className="font-bold text-slate-700">• Time Limitation:</span> Any cause of action must commence within one year after the cause of action accrues, or it will be permanently barred.
              </div>
            </div>
          </section>


          <section className="space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">9. Changes to Terms</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect. By continuing to access or use our services after those revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>


          <section className="pt-8 border-t border-slate-100 space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">10. Contact Information</h2>
            </div>
            <p className="text-sm font-medium text-slate-500">If you have any questions about these Terms, please contact us through our email:</p>
            <div className="max-w-md">
              <a href="mailto:leviticaconnect@gmail.com" className="flex min-w-0 items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/50 hover:border-slate-200 transition-colors text-sm font-bold text-slate-700">
                <Mail className="size-5 shrink-0 text-indigo-500" />
                <span className="min-w-0 break-all">leviticaconnect@gmail.com</span>
              </a>
            </div>
          </section>

        </div>
      </main>


      <Footer />
    </div>
  );
}
