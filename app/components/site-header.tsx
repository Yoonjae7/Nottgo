import Image from "next/image"
import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8464.JPG-Fg7R9AtGilJkRmLx9UmEGGUVTIGz9W.jpeg"
            alt="Nottgo"
            width={100}
            height={100}
            className="h-8 w-auto"
            priority
          />
          <span className="sr-only">Nottgo Campus Shuttle System</span>
        </Link>
      </div>
    </header>
  )
}
