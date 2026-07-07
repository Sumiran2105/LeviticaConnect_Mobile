import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#fcfcff] pt-12 pb-5 border-t border-slate-200/60">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">


        <div className="grid grid-cols-1 gap-9 md:grid-cols-12 md:gap-6 lg:gap-10">


          <div className="md:col-span-5 flex flex-col items-start">
            <Link to="/" className="relative flex h-12 w-40 items-center transition-opacity hover:opacity-90 mb-2">
              <img
                src="/assets/logo.png"
                alt="Levitica Connect"
                className="absolute left-0 top-1/2 w-40 max-w-none -translate-y-1/2 object-contain"
              />
            </Link>
            <p className="text-[10px] text-slate-800 font-bold tracking-wider mb-4">
              Powered By Levitica Technologies PVT LTD
            </p>
            <p className="text-sm text-slate-500 leading-relaxed font-medium mb-6 pr-4">
              Levitica Connect is an AI-powered collaboration platform that helps organizations communicate, collaborate, and grow all in one secure workspace.
            </p>
          </div>


          <div className="md:col-span-2 pt-2">
            <h4 className="text-[17px] font-bold text-slate-900 mb-4">Explore</h4>
            <ul className="space-y-3.5">
              <li><Link to="/" className="text-sm text-slate-500 hover:text-[#4f46e5] font-medium transition-colors">Home</Link></li>
              <li><Link to="/features" className="text-sm text-slate-500 hover:text-[#4f46e5] font-medium transition-colors">Features</Link></li>
              <li><Link to="/plans" className="text-sm text-slate-500 hover:text-[#4f46e5] font-medium transition-colors">Plans & Pricing</Link></li>
              <li><Link to="/contact" className="text-sm text-slate-500 hover:text-[#4f46e5] font-medium transition-colors">Contact</Link></li>
            </ul>
          </div>


          <div className="md:col-span-2 pt-2">
            <h4 className="text-[17px] font-bold text-slate-900 mb-4">Get Started</h4>
            <ul className="space-y-3.5">
              <li><Link to="/register" className="text-sm text-slate-500 hover:text-[#4f46e5] font-medium transition-colors">Create account</Link></li>
              <li><Link to="/login" className="text-sm text-slate-500 hover:text-[#4f46e5] font-medium transition-colors">Sign in</Link></li>
            </ul>
          </div>


          <div className="md:col-span-3 pt-2">
            <h4 className="text-[17px] font-bold text-slate-900 mb-4">Contact</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium mb-4">
              Levitica Technologies PVT LTD<br />
              Hyderabad, Telangana, India
            </p>
            <div className="flex flex-col gap-2.5 text-sm text-slate-500 font-medium">
              <a href="mailto:leviticaconnect@gmail.com" className="flex items-center gap-2 hover:text-[#4f46e5] transition-colors">
                <Mail className="size-4 text-slate-400" /> leviticaconnect@gmail.com
              </a>
              <a href="tel:+916305675199" className="flex items-center gap-2 hover:text-[#4f46e5] transition-colors">
                <Phone className="size-4 text-slate-400" /> +91 63056 75199
              </a>
            </div>
          </div>

        </div>


        <div className="mt-10 border-t border-slate-200/70 pt-5 flex flex-col md:flex-row items-center justify-between gap-4">

          <p className="text-[13px] text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} Levitica Connect. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/privacy" className="text-[13px] font-medium text-slate-400 hover:text-slate-600 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-[13px] font-medium text-slate-400 hover:text-slate-600 transition-colors">Terms of Service</Link>
          </div>

        </div>

      </div>
    </footer>
  );
}
