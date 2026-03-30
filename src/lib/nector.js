const reviewCache = new Map();

export const fetchNectorReviews = async (productId) => {
  if (!productId) return { count: 0, average: 0, list: [], stats: [] };

  const id = productId.split("/").pop();

  if (reviewCache.has(id)) {
    return reviewCache.get(id);
  }

  try {
    const res = await fetch(
      `https://platform.nector.io/api/v2/merchant/reviews?reference_product_id=${id}`,
      {
        headers: {
          "x-apikey": process.env.NECTOR_API_KEY,
          "x-workspaceid": process.env.NECTOR_WORKSPACE_ID,
          "x-source": "web",
        },
      }
    );

    const json = await res.json();
    if (!res.ok) {
      console.error(`Nector API Error for ${id}:`, res.status, json);
      return { count: 0, average: 0, list: [], stats: [] };
    }

    const data = json?.data || json || {};
    const stats = data.stats || [];
    const count = data.count || 0;
    const reviewsList = data.reviews || [];

    if (reviewsList.length === 0 && count > 0) {
      console.warn(`Nector: count is ${count} but reviews list is empty for ${id}. Check structure:`, JSON.stringify(json).substring(0, 200));
    }

    let total = 0;
    let ratingCount = 0;

    stats.forEach(s => {
      total += Number(s.rating) * Number(s.count);
      ratingCount += Number(s.count);
    });

    const reviews = {
      count,
      average: ratingCount ? Number((total / ratingCount).toFixed(1)) : 0,
      stats: stats.map(s => ({ rating: s.rating, count: s.count })),
      list: reviewsList.map(r => ({
        id: r.id,
        name: r.customer_name || "Verified Buyer",
        rating: r.rating,
        text: r.review_text,
        date: r.created_at,
        images: r.images || [],
        videos: r.videos || [],
        title: r.review_title
      }))
    };

    reviewCache.set(id, reviews);
    setTimeout(() => reviewCache.delete(id), 1 * 60 * 1000);

    return reviews;
  } catch (e) {
    console.error(`Error fetching Nector reviews for ${id}:`, e.message);
    return { count: 0, average: 0, list: [], stats: [] };
  }
};
