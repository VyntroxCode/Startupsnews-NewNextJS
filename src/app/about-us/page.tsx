import { getInnerPageContent } from "@/lib/data-adapter";
import AboutUsClient from "./AboutUsClient";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function AboutPage() {
	const contentHtml = await getInnerPageContent("about-us");
	return <AboutUsClient contentHtml={contentHtml} />;
}
