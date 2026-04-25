import { BannersService } from "@/modules/banners/service/banners.service";
import { BannersRepository } from "@/modules/banners/repository/banners.repository";
import { entityToBanner } from "@/modules/banners/utils/banners.utils";
import { BannerCarousel } from "./BannerCarousel";

// Initialize services
const bannersRepository = new BannersRepository();
const bannersService = new BannersService(bannersRepository);

export async function BannerCarouselWrapper() {
  try {
    const entities = await bannersService.getActiveBanners(10);
    const banners = entities.map(entityToBanner);

    if (banners.length === 0) {
      return null;
    }

    return <BannerCarousel banners={banners} />;
  } catch (error) {
    console.error("Error fetching banners:", error);
    return null;
  }
}

