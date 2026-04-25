/**
 * Script to populate existing events with dummy content
 * Run with: npx tsx scripts/populate-event-content.ts
 */

import { EventsService } from '@/modules/events/service/events.service';
import { EventsRepository } from '@/modules/events/repository/events.repository';

const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);

// Dummy content templates for different event types
const DUMMY_DESCRIPTIONS: Record<string, string> = {
  default: `<p>Join us for an exciting startup event featuring industry leaders, innovative startups, and networking opportunities. This event brings together entrepreneurs, investors, and technology enthusiasts to explore the latest trends and opportunities in the startup ecosystem.</p>

<p>What to expect:</p>
<ul>
  <li>Keynote presentations from industry experts</li>
  <li>Startup pitch sessions and demos</li>
  <li>Networking sessions with investors and founders</li>
  <li>Panel discussions on emerging technologies</li>
  <li>Exhibition area showcasing innovative products</li>
</ul>

<p>This is a must-attend event for anyone interested in the startup world. Don't miss out on this opportunity to connect with like-minded individuals and learn from the best in the industry.</p>`,

  tech: `<p>Experience the future of technology at this premier tech event. Discover cutting-edge innovations, meet industry pioneers, and explore the latest developments in technology and innovation.</p>

<p>Event highlights:</p>
<ul>
  <li>Tech demos and product launches</li>
  <li>Expert-led workshops and masterclasses</li>
  <li>Startup showcase featuring emerging tech companies</li>
  <li>Investor meetups and funding opportunities</li>
  <li>Networking sessions with tech leaders</li>
</ul>

<p>Whether you're a developer, entrepreneur, or tech enthusiast, this event offers valuable insights and connections in the technology sector.</p>`,

  startup: `<p>Connect with the startup community at this dynamic event designed for entrepreneurs, investors, and innovators. Learn from successful founders, discover new opportunities, and build meaningful connections.</p>

<p>Program includes:</p>
<ul>
  <li>Founder success stories and lessons learned</li>
  <li>Investor pitch sessions</li>
  <li>Startup ecosystem discussions</li>
  <li>Mentorship opportunities</li>
  <li>Networking with potential co-founders and partners</li>
</ul>

<p>This event is perfect for early-stage entrepreneurs looking to accelerate their startup journey and connect with the right people.</p>`,

  fintech: `<p>Explore the intersection of finance and technology at this specialized fintech event. Learn about the latest innovations in digital payments, blockchain, cryptocurrency, and financial services.</p>

<p>Featured topics:</p>
<ul>
  <li>Digital banking and payment solutions</li>
  <li>Blockchain and cryptocurrency trends</li>
  <li>Regulatory updates and compliance</li>
  <li>Fintech startup showcases</li>
  <li>Investment opportunities in fintech</li>
</ul>

<p>Join industry leaders, regulators, and innovators as they discuss the future of financial technology.</p>`,

  ai: `<p>Dive deep into artificial intelligence and machine learning at this cutting-edge event. Discover how AI is transforming industries and creating new opportunities for businesses and entrepreneurs.</p>

<p>Event features:</p>
<ul>
  <li>AI/ML expert presentations</li>
  <li>Live AI demonstrations</li>
  <li>Startup pitches from AI companies</li>
  <li>Panel discussions on AI ethics and future</li>
  <li>Networking with AI researchers and practitioners</li>
</ul>

<p>Perfect for developers, data scientists, and business leaders interested in leveraging AI for innovation.</p>`,

  healthtech: `<p>Discover innovations in healthcare technology at this specialized healthtech event. Learn about digital health solutions, telemedicine, medical devices, and the future of healthcare delivery.</p>

<p>What's included:</p>
<ul>
  <li>Healthcare innovation showcases</li>
  <li>Expert talks on digital health trends</li>
  <li>Startup presentations in healthtech space</li>
  <li>Regulatory and compliance discussions</li>
  <li>Networking with healthcare professionals and investors</li>
</ul>

<p>Join healthcare professionals, technologists, and entrepreneurs shaping the future of healthcare.</p>`,

  ecommerce: `<p>Learn about the latest trends in e-commerce and online retail at this comprehensive event. Explore new platforms, marketing strategies, and technologies driving the future of online shopping.</p>

<p>Coverage includes:</p>
<ul>
  <li>E-commerce platform innovations</li>
  <li>Digital marketing strategies</li>
  <li>Supply chain and logistics solutions</li>
  <li>Customer experience optimization</li>
  <li>E-commerce startup showcases</li>
</ul>

<p>Ideal for online retailers, marketers, and entrepreneurs building e-commerce businesses.</p>`,
};

// Map event titles/locations to content types
function getContentType(event: { title: string; location: string }): string {
  const titleLower = event.title.toLowerCase();
  const locationLower = event.location.toLowerCase();

  if (titleLower.includes('tech') || titleLower.includes('technology') || locationLower.includes('tech')) {
    return 'tech';
  }
  if (titleLower.includes('startup') || titleLower.includes('entrepreneur')) {
    return 'startup';
  }
  if (titleLower.includes('fintech') || titleLower.includes('finance') || titleLower.includes('fintech')) {
    return 'fintech';
  }
  if (titleLower.includes('ai') || titleLower.includes('artificial intelligence') || titleLower.includes('machine learning')) {
    return 'ai';
  }
  if (titleLower.includes('health') || titleLower.includes('medical') || titleLower.includes('healthcare')) {
    return 'healthtech';
  }
  if (titleLower.includes('ecommerce') || titleLower.includes('e-commerce') || titleLower.includes('retail')) {
    return 'ecommerce';
  }

  return 'default';
}

async function populateEventContent() {
  try {
    console.log('Fetching all events...');
    const allEvents = await eventsService.getAllEvents({});

    if (allEvents.length === 0) {
      console.log('No events found in database');
      return;
    }

    console.log(`Found ${allEvents.length} event(s)`);
    let updatedCount = 0;
    const results = [];

    // Update each event that doesn't have a description
    for (const event of allEvents) {
      if (!event.description || event.description.trim() === '') {
        const contentType = getContentType(event);
        const description = DUMMY_DESCRIPTIONS[contentType] || DUMMY_DESCRIPTIONS.default;

        // Also ensure excerpt exists if missing
        const excerpt = event.excerpt || `${event.title} - Join us for an exciting event featuring industry leaders, innovative startups, and networking opportunities.`;

        try {
          await eventsService.updateEvent(event.id, {
            description,
            excerpt,
          });

          updatedCount++;
          results.push({
            id: event.id,
            slug: event.slug,
            title: event.title,
            status: 'updated',
          });
          console.log(`✓ Updated: ${event.title} (${event.slug})`);
        } catch (error) {
          results.push({
            id: event.id,
            slug: event.slug,
            title: event.title,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.error(`✗ Error updating ${event.title}:`, error);
        }
      } else {
        results.push({
          id: event.id,
          slug: event.slug,
          title: event.title,
          status: 'skipped',
          reason: 'Already has description',
        });
        console.log(`- Skipped: ${event.title} (already has description)`);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total events: ${allEvents.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${allEvents.length - updatedCount}`);
    console.log('\nDone!');
  } catch (error) {
    console.error('Error populating event content:', error);
    process.exit(1);
  }
}

// Run the script
populateEventContent()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

