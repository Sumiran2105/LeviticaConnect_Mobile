import { Menu } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Plans & Pricing", href: "/plans" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-brand-line/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-10">
        <Link to="/" className="relative flex h-10 w-40 items-center transition-opacity hover:opacity-90">
          <img
            src="/assets/logo.png"
            alt="Levitica Connect"
            className="absolute left-0 top-1/2 w-36 max-w-none -translate-y-1/2 object-contain"
          />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="text-sm font-semibold text-brand-ink/78 transition hover:text-brand-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" className="h-11 rounded-full px-5 text-sm font-semibold text-brand-ink" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button className="h-11 rounded-full bg-brand-primary px-6 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90" asChild>
            <Link to="/register">Get Started</Link>
          </Button>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-brand-ink hover:bg-brand-soft">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="z-50 border-l border-brand-line bg-white/95 backdrop-blur p-6 w-[300px] sm:w-[400px]">
              <SheetHeader className="mb-8 p-0">
                <SheetTitle className="text-left text-brand-ink">Levitica Connect</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-5">
                {navItems.map((item) => (
                  <Link key={item.href} to={item.href} className="text-lg font-semibold text-brand-ink">
                    {item.label}
                  </Link>
                ))}
                <div className="my-2 h-px bg-brand-line" />
                <Button className="h-12 w-full justify-center rounded-full bg-brand-primary px-5 text-white" asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
                <Button variant="outline" className="h-12 w-full justify-center rounded-full border-brand-line bg-white px-5" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
