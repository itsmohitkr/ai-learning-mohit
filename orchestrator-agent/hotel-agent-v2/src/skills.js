// skills.js — unchanged from a2a-flygpt/hotel-agent/src/skills.js
// Mocked hotel data, same approach as Joy Air's MCP server.

const MOCK_HOTELS = [
  { name: 'Hilton London Heathrow',  rating: 4.2, price: 142, distance_km: 1.2 },
  { name: 'Premier Inn Heathrow T4', rating: 3.9, price: 89,  distance_km: 2.5 },
  { name: 'Sofitel London Heathrow', rating: 4.6, price: 178, distance_km: 0.3 },
  { name: 'Holiday Inn Express',     rating: 3.7, price: 76,  distance_km: 4.1 },
];

async function searchHotels({ location, check_in, check_out, max_price }) {
  await new Promise(r => setTimeout(r, 400));

  const results = MOCK_HOTELS.filter(h => !max_price || h.price <= max_price);

  return {
    location, check_in, check_out,
    hotels: results.map((h, i) => ({
      id: `HTL-${i + 1}`,
      name: h.name,
      rating: h.rating,
      price_per_night: h.price,
      distance_km: h.distance_km,
    })),
  };
}

async function bookHotel({ hotel_id, guest_name, email, check_in, check_out }) {
  await new Promise(r => setTimeout(r, 600));

  const hotel = MOCK_HOTELS[parseInt(hotel_id.replace('HTL-', ''), 10) - 1];
  if (!hotel) return { error: `Unknown hotel_id: ${hotel_id}` };

  return {
    confirmation_number: `HB-${Date.now().toString(36).toUpperCase()}`,
    hotel: hotel.name,
    guest_name, email, check_in, check_out,
    status: 'confirmed',
  };
}

module.exports = { searchHotels, bookHotel };
