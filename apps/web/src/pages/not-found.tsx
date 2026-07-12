import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowLeft, Search, PackageX, ShoppingCart, Ghost } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const floatingItems = [
    { icon: PackageX, delay: 0, x: -20, y: -40, size: 32, opacity: 0.2 },
    { icon: ShoppingCart, delay: 0.5, x: 40, y: -20, size: 48, opacity: 0.15 },
    { icon: Ghost, delay: 1, x: -30, y: 30, size: 40, opacity: 0.1 },
    { icon: ShoppingBag, delay: 1.5, x: 25, y: 40, size: 36, opacity: 0.25 },
  ];

  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      
      {/* Dynamic Background Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-lighten" />
      </div>

      {/* Floating Elements Background */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {floatingItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={i}
              className="absolute text-primary"
              style={{ opacity: item.opacity }}
              animate={{
                y: [item.y - 15, item.y + 15, item.y - 15],
                x: [item.x - 10, item.x + 10, item.x - 10],
                rotate: [0, 10, -10, 0]
              }}
              transition={{
                duration: 6 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: item.delay
              }}
            >
              <Icon size={item.size} />
            </motion.div>
          );
        })}
      </div>

      <div className="max-w-2xl w-full text-center space-y-10 relative z-10">
        
        {/* Interactive 404 Illustration Area */}
        <motion.div 
          className="relative flex justify-center items-center h-64"
          animate={{
            x: mousePosition.x * -30,
            y: mousePosition.y * -30,
          }}
          transition={{ type: "spring", stiffness: 100, damping: 30 }}
        >
          <motion.h1 
            initial={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-[12rem] md:text-[16rem] font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-primary/40 to-primary/5 select-none"
          >
            404
          </motion.h1>
          
          <motion.div 
            initial={{ y: 50, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring", bounce: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <ShoppingBag className="w-32 h-32 md:w-40 md:h-40 text-primary drop-shadow-2xl relative z-10" strokeWidth={1.5} />
              
              {/* Question Mark floating out of bag */}
              <motion.div
                animate={{ 
                  y: [-10, -30, -10],
                  x: [0, 10, 0],
                  rotate: [-10, 10, -10]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 right-2 text-5xl font-bold text-primary z-20 drop-shadow-lg"
              >
                ?
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Text Content */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Oops! Aisle Empty.
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
            We've scoured the entire store, but the page you're looking for seems to have vanished from our shelves.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
        >
          <Button asChild size="lg" className="w-full sm:w-auto group h-14 px-8 rounded-full text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
            <Link href="/">
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
              Back to Store
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto group h-14 px-8 rounded-full text-base border-2 hover:bg-primary/5 transition-all duration-300">
            <Link href="/search">
              <Search className="w-5 h-5 mr-2 text-muted-foreground transition-transform group-hover:scale-110" />
              Search Products
            </Link>
          </Button>
        </motion.div>

      </div>
    </div>
  );
}
