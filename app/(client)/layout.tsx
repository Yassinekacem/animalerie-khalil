
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WishlistProvider from "@/components/WishlistProvider";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WishlistProvider><div className="min-h-screen flex flex-col">
      <Navbar /> 

      <main className="flex-1">
        { children } 
      </main>
             
      <Footer />
    </div></WishlistProvider>
  );
}
