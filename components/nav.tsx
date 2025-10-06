import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ModeToggle } from "./modeToggle";
import { Button } from "./ui/button";

export function Nav() {
  return (
    <header className="flex items-center justify-between p-4 lg:px-8 py-6">
      <div className="flex items-center space-x-8">
        <Link href="#" className="flex items-center">
          <span className="font-extrabold text-lg">KIBBY</span>
        </Link>
        <nav className="hidden lg:flex space-x-6">
          <Link href="#" className="text-sm font-medium">
            Create
          </Link>
          <Link href="#" className="text-sm font-medium">
            Dashboard
          </Link>
          <Link href="#" className="text-sm font-medium">
            Profile
          </Link>
          <Link href="#" className="text-sm font-medium">
            Contact
          </Link>
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        <ModeToggle />
        <Button className=" rounded-full px-6 py-3 text-sm font-medium">
          Connect <ArrowRight />
        </Button>
      </div>
    </header>
  );
}