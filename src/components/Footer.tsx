export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="font-display text-2xl font-bold">
            গরু <span className="text-gold">কিনবো</span>
          </div>
          <p className="max-w-md text-sm text-primary-foreground/70">
            বিশ্বস্ত ডিজিটাল কোরবানি পশুর হাট — সরাসরি খামারি ও ক্রেতার মধ্যে সংযোগ।
          </p>
          <p className="mt-4 text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} গরু কিনবো · বাংলাদেশ
          </p>
        </div>
      </div>
    </footer>
  );
}
