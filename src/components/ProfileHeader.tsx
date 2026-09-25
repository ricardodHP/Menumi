import { useState } from "react";
import { Heart, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import QrCodeModal from "@/components/QrCodeModal";
import type { RestaurantInfo } from "@/data/restaurant";

interface ProfileHeaderProps {
  restaurant: RestaurantInfo;
}

const ProfileHeader = ({ restaurant }: ProfileHeaderProps) => {
  const [qrOpen, setQrOpen] = useState(false);
  const menuUrl = `${window.location.origin}/r/${restaurant.username}`;
  return (
    <div className="px-4 pt-4 pb-2 md:mx-auto md:max-w-4xl md:px-10 md:py-8">
      <div className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:gap-x-10 md:gap-y-4">
        {/* Restaurant identity */}
        <div className="flex items-center gap-4 mb-3 md:row-span-2 md:mb-0 md:justify-center">
          <div className="story-ring shrink-0">
            <div className="rounded-full overflow-hidden bg-background p-[2px]">
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                width={128}
                height={128}
                className="rounded-full w-[86px] h-[86px] object-cover md:w-32 md:h-32"
              />
            </div>
          </div>
        </div>

        {/* Name + Bio */}
        <div className="mb-3 md:mb-0">
          <h1 className="text-sm font-bold text-foreground md:text-xl">{restaurant.name}</h1>
          {restaurant.bio && (
            <p className="text-sm text-foreground whitespace-pre-line mt-1 leading-relaxed md:text-base">
              {restaurant.bio}
            </p>
          )}
          {(restaurant.address || restaurant.hours) && (
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5 md:text-sm">
              {restaurant.address && <p>📍 {restaurant.address}</p>}
              {restaurant.hours && <p>🕒 {restaurant.hours}</p>}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-2 md:mb-0">
          {restaurant.instagramLink && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-8 text-xs font-semibold md:flex-none md:px-6"
              onClick={() => window.open(restaurant.instagramLink, "_blank")}
            >
              <Heart className="w-3.5 h-3.5 mr-1" />
              Seguir
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
    </div>
  );
};

export default ProfileHeader;
