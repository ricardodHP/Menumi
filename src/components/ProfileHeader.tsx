import { useState } from "react";
import { ExternalLink, Heart, MapPin, Phone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import QrCodeModal from "@/components/QrCodeModal";
import BusinessHoursDetailsDialog from "@/components/BusinessHoursDetailsDialog";
import type { RestaurantInfo } from "@/data/restaurant";
import { formatBusinessHoursSummary } from "@/lib/business-hours";
import { buildInstagramUrl, getInstagramDisplayUsername } from "@/lib/instagram";
import { DELIVERY_PLATFORMS } from "@/lib/delivery-links";

interface ProfileHeaderProps {
  restaurant: RestaurantInfo;
  variant?: "social" | "classic";
}

const ProfileHeader = ({ restaurant, variant = "social" }: ProfileHeaderProps) => {
  const isCompact = variant === "classic";
  const [qrOpen, setQrOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const menuUrl = `${window.location.origin}/r/${restaurant.username}`;
  const instagramUrl = buildInstagramUrl(restaurant.instagramUsername);
  const businessHoursSummary = restaurant.businessHours
    ? formatBusinessHoursSummary(restaurant.businessHours)
    : null;
  const deliveryLinks = DELIVERY_PLATFORMS.flatMap(({ key, label }) => {
    const url = restaurant.deliveryLinks?.[key];
    return url ? [{ key, label, url }] : [];
  }).concat(restaurant.deliveryLinks?.other
    ? [{ key: "other", label: restaurant.deliveryLinks.other.label, url: restaurant.deliveryLinks.other.url }]
    : []);
  const mapUrl = restaurant.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
    : null;
  const phoneDigits = restaurant.phone?.replace(/\D/g, "");
  const phoneUrl = phoneDigits
    ? `${restaurant.phone?.trim().startsWith("+") ? "+" : ""}${phoneDigits}`
    : null;
  return (
    <div
      data-profile-variant={isCompact ? variant : undefined}
      className={isCompact
        ? "px-4 pt-3 pb-2 md:mx-auto md:max-w-6xl md:px-6 md:py-4"
        : "px-4 pt-4 pb-2 md:mx-auto md:max-w-4xl md:px-10 md:py-8"}
    >
      <div className={isCompact
        ? "grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
        : "sm:grid sm:grid-cols-[104px_minmax(0,1fr)] sm:items-center sm:gap-x-5 sm:gap-y-3 md:grid-cols-[180px_minmax(0,1fr)] md:gap-x-10 md:gap-y-4"}
      >
        {/* Restaurant identity */}
        <div className={isCompact
          ? "flex items-center justify-center"
          : "flex items-center gap-4 mb-3 sm:row-span-2 sm:mb-0 sm:justify-center"}
        >
          <div className="story-ring shrink-0">
            <div className="rounded-full overflow-hidden bg-background p-[2px]">
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                width={128}
                height={128}
                className={isCompact
                  ? "rounded-full h-12 w-12 object-cover sm:h-14 sm:w-14 md:h-16 md:w-16"
                  : "rounded-full w-[86px] h-[86px] object-cover sm:w-24 sm:h-24 md:w-32 md:h-32"}
              />
            </div>
          </div>
        </div>

        {/* Name + Bio */}
        <div className={isCompact ? "min-w-0" : "mb-3 sm:mb-0"}>
          <h1 className={isCompact
            ? "text-base font-bold leading-tight text-foreground md:text-lg"
            : "text-sm font-bold text-foreground sm:text-lg md:text-xl"}
          >
            {restaurant.name}
          </h1>
          {restaurant.bio && (
            <p className={isCompact
              ? "mt-0.5 line-clamp-2 whitespace-pre-line text-xs leading-snug text-foreground sm:text-sm"
              : "text-sm text-foreground whitespace-pre-line mt-1 leading-relaxed sm:text-base"}
            >
              {restaurant.bio}
            </p>
          )}
          {(restaurant.address || phoneUrl || restaurant.hours || restaurant.businessHours || restaurant.businessHoursLoadError) && (
            <div className={isCompact
              ? "mt-1 space-y-0.5 text-[11px] text-muted-foreground sm:text-xs"
              : "text-xs text-muted-foreground mt-2 space-y-0.5 sm:text-sm"}
            >
              {restaurant.address && mapUrl && (
                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 hover:text-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{restaurant.address}</span>
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Abrir ubicación en mapas</span>
                </a>
              )}
              {restaurant.phone?.trim() && phoneUrl && (
                <a href={`tel:${phoneUrl}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{restaurant.phone.trim()}</span>
                </a>
              )}
              {restaurant.businessHoursLoadError ? (
                <p role="status">🕒 No se pudieron cargar los horarios.</p>
              ) : restaurant.businessHours ? (
                <div className="flex flex-wrap items-center gap-x-2">
                  <p>🕒 {businessHoursSummary?.text}</p>
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => setHoursOpen(true)}
                  >
                    Ver horarios
                  </button>
                </div>
              ) : restaurant.hours ? (
                <p>🕒 {restaurant.hours}</p>
              ) : null}
            </div>
          )}
        </div>

        {deliveryLinks.length > 0 && (
          <div className={isCompact
            ? "col-span-2 mt-3 flex flex-wrap items-center gap-2 sm:col-span-3"
            : "mt-3 flex flex-wrap items-center gap-2"}
          >
            <span className="text-xs font-medium text-muted-foreground">Pide a domicilio:</span>
            {deliveryLinks.map(({ key, label, url }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                {label}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className={isCompact
          ? "col-span-2 flex gap-2 sm:col-span-1 sm:col-start-3 sm:justify-self-end"
          : "flex gap-2 mb-2 mt-2 sm:col-start-2 sm:justify-start sm:mb-0 sm:mt-0"}
        >
          {instagramUrl && (
            <Button asChild variant="default" size="sm" className={isCompact
              ? "h-8 flex-1 text-xs font-semibold sm:flex-none"
              : "flex-1 h-8 text-xs font-semibold md:flex-none md:px-6"}
            >
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                <Heart className="w-3.5 h-3.5 mr-1" />
                Seguir {getInstagramDisplayUsername(restaurant.instagramUsername)}
              </a>
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setQrOpen(true)}
            aria-label="Compartir QR del menú"
            title="Compartir QR del menú"
          >
            <QrCode className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <QrCodeModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={menuUrl}
        restaurantName={restaurant.name}
        logoUrl={restaurant.logo}
        customizable={false}
      />
      {restaurant.businessHours && (
        <BusinessHoursDetailsDialog days={restaurant.businessHours} open={hoursOpen} onOpenChange={setHoursOpen} />
      )}
    </div>
  );
};

export default ProfileHeader;
