import type { APIRoute } from "astro";
import { createServerSDK } from "@recogito/studio-sdk";
import { serializeQuill } from "../lib/transform";

export const GET: APIRoute = async ({ request, params, cookies }) => {
  const projectId = params.projectId;
  const documentId = params.documentId;

  const sdk = await createServerSDK(request, cookies, import.meta.env);

  const { error: profileError, data: profile } =
    await sdk.profile.getMyProfile();
  if (profileError || !profile)
    return new Response(JSON.stringify({ message: "Not authorized" }));

  const hasSelectPermissions = await sdk.project.hasSelectPermissions(
    profile,
    projectId!
  );
  if (!hasSelectPermissions)
    return new Response(JSON.stringify({ message: "Not authorized" }));

  const { error: layersError, data: layers } =
    await sdk.layers.getDocumentLayersInProject(documentId!, projectId!);

  if (layersError || !layers)
    return new Response(JSON.stringify({ message: layersError?.message }));

  const layerIds = layers.map((l) => l.id);

  const { error: anntotationsError, data: annotations } =
    await sdk.annotations.get(layerIds);
  if (anntotationsError || !annotations)
    return new Response(
      JSON.stringify({ message: anntotationsError?.message })
    );

  const output = serializeQuill(annotations);

  const filename = `${projectId}-${documentId}.json`;

  return new Response(JSON.stringify(output), {
    headers: {
      "Content-Type": "text/json",
      "Content-Disposition": `attachment;filename=${filename}`,
    },
    status: 200,
  });
};
