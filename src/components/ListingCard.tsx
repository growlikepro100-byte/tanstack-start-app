import { Link } from "@tanstack/react-router";
import { MapPin, BadgeCheck, Weight, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { formatPriceBn, formatAgeBn, formatWeightBn } from "@/lib/format";

export type ListingCardData = {
  id: string;
  title: string;
  price: number;
  age_months: number | null;
  weight_kg: number | null;
  location: string | null;
  featured?: boolean;
  cover_url?: string | null;
};

export function ListingCard({ data }: { data: ListingCardData }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group h-full"
    >
      <Link
        to="/listings/$id"
        params={{ id: data.id }}
        className="block h-full overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {data.cover_url ? (
            <img
              src={data.cover_url}
              alt={data.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl">🐄</div>
          )}
          {data.featured && (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1 text-xs font-semibold text-gold-foreground shadow-gold">
              <BadgeCheck className="h-3.5 w-3.5" /> ফিচার্ড
            </span>
          )}
          <div className="absolute bottom-3 right-3 rounded-xl bg-background/95 px-3 py-1.5 text-sm font-bold text-primary shadow-card backdrop-blur">
            {formatPriceBn(data.price)}
          </div>
        </div>
        <div className="p-4">
          <h3 className="line-clamp-1 text-base font-semibold text-foreground group-hover:text-primary">
            {data.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {formatAgeBn(data.age_months)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Weight className="h-3.5 w-3.5" /> {formatWeightBn(data.weight_kg)}
            </span>
          </div>
          {data.location && (
            <p className="mt-2 line-clamp-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {data.location}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
