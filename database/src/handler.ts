import { createApi, type ApiEvent } from "./api.js";
import { getPrisma } from "./client.js";
import { loadDatabaseParameter } from "./parameter.js";
import { createStore } from "./store.js";
import { createPhotoStorage, cleanupPhotos } from "./photos.js";

const storage = createPhotoStorage();
const api = createApi({
  issuer: process.env.COGNITO_ISSUER ?? "",
  clientId: process.env.COGNITO_CLIENT_ID ?? "",
  async getStore(identity) {
    await loadDatabaseParameter();
    return createStore(getPrisma(), identity, storage);
  },
  logError(requestId) { console.error(JSON.stringify({ event: "climbs_api_error", requestId })); },
});

export async function handler(event: ApiEvent | { maintenance: "photo-cleanup" }) {
  if ("maintenance" in event && !("requestContext" in event) && event.maintenance === "photo-cleanup") {
    await loadDatabaseParameter();
    return { deleted: await cleanupPhotos(getPrisma(), storage) };
  }
  return api(event as ApiEvent);
}
