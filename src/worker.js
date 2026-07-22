export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health" || url.pathname === "/") {
      return Response.json({
        service: "goldclaw",
        status: "ok",
        repository: "marzton/goldclaw",
      });
    }

    return Response.json(
      {
        error: "not_found",
        service: "goldclaw",
      },
      { status: 404 },
    );
  },
};
