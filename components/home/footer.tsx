import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-12 md:grid-cols-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary" />
            <span className="font-semibold">Expo-like</span>
          </div>
          <p className="text-sm text-muted-foreground">Build, preview, and ship apps faster.</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Product</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <Link href="#" className="hover:text-foreground">
                Features
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-foreground">
                Changelog
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Resources</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <Link href="#" className="hover:text-foreground">
                Docs
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-foreground">
                Guides
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-foreground">
                Community
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Company</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <Link href="#" className="hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-foreground">
                Blog
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-foreground">
                Careers
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-6">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Expo-like. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
