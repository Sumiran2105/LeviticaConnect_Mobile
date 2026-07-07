import {
  User,
  CreditCard,
  BookOpen,
  Laptop,
  Video,
  Receipt,
  Mail,
  Globe,
  Baby,
  UserCheck,
  Calendar,
  RefreshCw,
  Info
} from "lucide-react";
import { Header } from "./landing/header";
import { Footer } from "./landing/footer";

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 selection:bg-indigo-100">
      <Header />


      <main className="mx-auto max-w-5xl px-4 pb-14 pt-28 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 sm:p-8 md:p-12 space-y-10">


          <div className="mx-auto max-w-3xl text-center border-b border-slate-100 pb-8 space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Privacy Policy</h1>
            <p className="text-sm font-semibold text-slate-400">Effective Date: October 19, 2024</p>
            <div className="w-12 h-1 bg-indigo-600 mx-auto rounded-full mt-4" />
          </div>


          <div className="p-5 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl flex gap-3.5 items-start">
            <Info className="size-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm sm:text-base leading-relaxed text-indigo-950 font-medium">
              <span className="font-bold text-indigo-900">Levitica Technologies</span> operates Levitica Connect, a real-time team messaging, video calling, and workspace collaboration platform designed for organizations. The platform provides secure channels, direct messaging, document sharing, and collaborative tools to streamline team operations.
            </p>
          </div>


          <section className="space-y-6">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Information We Collect</h2>
            </div>
            <p className="text-sm font-medium text-slate-500">We may collect the following information:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


              <div className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0 self-start">
                  <User className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Personal Information</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Name, email address, workspace credentials, profile photo, and job title.</p>
                </div>
              </div>


              <div className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0 self-start">
                  <CreditCard className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Payment Information</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Payment transactions processed through Razorpay. We do not store credit/debit card details.</p>
                </div>
              </div>


              <div className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0 self-start">
                  <BookOpen className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Workspace & Team Data</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Organization details, channel configurations, team memberships, and collaborative settings.</p>
                </div>
              </div>


              <div className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl flex-shrink-0 self-start">
                  <Laptop className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Device Information</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Device model, operating system version, and app usage statistics.</p>
                </div>
              </div>


              <div className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl flex-shrink-0 self-start">
                  <Video className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Meeting & Video Call Data</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Logs of scheduled meetings, attendance metadata, video/audio stream duration, and call participation status.</p>
                </div>
              </div>


              <div className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl flex-shrink-0 self-start">
                  <Receipt className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Transaction Records</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Order ID, payment ID, and purchased course information for record keeping.</p>
                </div>
              </div>

            </div>
          </section>


          <section className="space-y-6">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">How We Use Your Information</h2>
            </div>
            <p className="text-sm font-medium text-slate-500">We use the collected data to:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {[
                "Manage workspace administrator and member accounts.",
                "Provide access to channels, direct messages, and collaborative workspaces.",
                "Allow users to initiate and join scheduled audio/video meetings.",
                "Maintain message history, search indexing, and shared file libraries.",
                "Process subscription payments securely using Razorpay.",
                "Send workspace notifications, updates, and critical security alerts.",
                "Improve our services and workspace performance.",
                "Enable organization directory lookups and cross-team communications."
              ].map((use, idx) => (
                <div key={idx} className="flex gap-2.5 items-start text-sm font-semibold text-slate-600">
                  <span className="size-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{use}</span>
                </div>
              ))}
            </div>
          </section>


          <section className="space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Payment Processing</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              All payments are processed securely through <span className="font-bold text-indigo-600">Razorpay</span>. We do not store credit card, debit card, or bank details on our servers. We may store transaction identifiers, such as order ID, payment ID, and purchased course information for record keeping.
            </p>
          </section>


          <section className="space-y-6">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Third-Party Services</h2>
            </div>
            <p className="text-sm font-medium text-slate-500">Levitica Connect integrates with third-party services to provide core functionality:</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="p-6 border border-slate-100 rounded-2xl text-center space-y-3 bg-slate-50/20">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full w-fit mx-auto">
                  <CreditCard className="size-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Razorpay</h3>
                <p className="text-xs font-semibold text-slate-400">Secure subscription processing</p>
              </div>

              <div className="p-6 border border-slate-100 rounded-2xl text-center space-y-3 bg-slate-50/20">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-fit mx-auto">
                  <Video className="size-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Zoom Integration</h3>
                <p className="text-xs font-semibold text-slate-400">Hosting collaborative video meetings</p>
              </div>

              <div className="p-6 border border-slate-100 rounded-2xl text-center space-y-3 bg-slate-50/20">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-full w-fit mx-auto">
                  <Mail className="size-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Email Services</h3>
                <p className="text-xs font-semibold text-slate-400">Sending notifications and updates</p>
              </div>

            </div>
          </section>


          <section className="space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Data Security</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              We protect your information using <span className="font-bold text-indigo-600">HTTPS encryption</span>, secure authentication mechanisms, and controlled access to backend systems. While we take strong measures to protect your data, no system can guarantee absolute security.
            </p>
          </section>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">


            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-slate-800">
                <Baby className="size-4.5 text-indigo-500" />
                <h3 className="font-bold text-sm">Children&apos;s Privacy</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                Levitica Technologies is intended for users aged 13 years and older. We do not knowingly collect personal information from children under the age of 13.
              </p>
            </div>


            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-slate-800">
                <UserCheck className="size-4.5 text-indigo-500" />
                <h3 className="font-bold text-sm">User Rights</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                Users may request access, correction, or deletion of their personal data by contacting us through our official website.
              </p>
            </div>


            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-slate-800">
                <Calendar className="size-4.5 text-indigo-500" />
                <h3 className="font-bold text-sm">Data Retention</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                We retain user information only as long as necessary to provide services and comply with legal obligations.
              </p>
            </div>


            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-slate-800">
                <RefreshCw className="size-4.5 text-indigo-500" />
                <h3 className="font-bold text-sm">Changes to This Policy</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                We may update this Privacy Policy periodically. Any updates will be posted on our official website or within the application.
              </p>
            </div>

          </div>


          <section className="pt-8 border-t border-slate-100 space-y-4">
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Contact Information</h2>
            </div>
            <p className="text-sm font-medium text-slate-500">For any questions regarding this Privacy Policy, please contact us through our website and email:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href="mailto:info@leviticatechnologies.com" className="flex min-w-0 items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/50 hover:border-slate-200 transition-colors text-sm font-bold text-slate-700">
                <Mail className="size-5 shrink-0 text-indigo-500" />
                <span className="min-w-0 break-all">leviticaconnect@gmail.com</span>
              </a>
              <a href="http://www.leviticatechnologies.com" target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/50 hover:border-slate-200 transition-colors text-sm font-bold text-slate-700">
                <Globe className="size-5 shrink-0 text-indigo-500" />
                <span className="min-w-0 break-all">www.leviticatechnologies.com</span>
              </a>
            </div>
          </section>

        </div>
      </main>


      <Footer />
    </div>
  );
}
