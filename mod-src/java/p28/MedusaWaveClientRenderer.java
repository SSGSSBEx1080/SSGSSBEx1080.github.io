package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.items.MedusaItem;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.Camera;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.LightTexture;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RenderLevelLastEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * Draws the petrification wave as one real textured sphere, not as a cloud of
 * particles. It grows at the same fixed 1.6 blocks per tick as the server
 * wave, so large Science Power radii take proportionally longer to reach.
 */
@Mod.EventBusSubscriber(modid = ZitraksMode.MODID,
        bus = Mod.EventBusSubscriber.Bus.FORGE,
        value = Dist.CLIENT)
public final class MedusaWaveClientRenderer {
    private static final int LATITUDE_SEGMENTS = 32;
    private static final int LONGITUDE_SEGMENTS = 48;

    private static final ResourceLocation WAVE_TEXTURE =
            new ResourceLocation(ZitraksMode.MODID, "textures/misc/medusa_wave.png");
    private static final RenderType WAVE_RENDER_TYPE = RenderType.entityTranslucent(WAVE_TEXTURE);
    private static final List<WaveVisual> ACTIVE_WAVES = new ArrayList<>();

    private MedusaWaveClientRenderer() {
    }

    public static void start(double x, double y, double z, int radius) {
        Minecraft minecraft = Minecraft.getInstance();
        if (minecraft.level == null) return;

        ACTIVE_WAVES.add(new WaveVisual(new Vec3(x, y, z), Math.max(1, radius),
                minecraft.level.getGameTime()));
    }

    @SubscribeEvent
    public static void render(RenderLevelLastEvent event) {
        Minecraft minecraft = Minecraft.getInstance();
        Level level = minecraft.level;
        if (level == null || ACTIVE_WAVES.isEmpty()) return;

        // Forge 43.5.0 RenderLevelLastEvent does not expose getCamera().
        // The active camera is obtained from the 1.19.2 GameRenderer instead.
        Camera camera = minecraft.gameRenderer.getMainCamera();
        Vec3 cameraPos = camera.getPosition();
        PoseStack poseStack = event.getPoseStack();
        MultiBufferSource.BufferSource buffers = minecraft.renderBuffers().bufferSource();
        VertexConsumer vertices = buffers.getBuffer(WAVE_RENDER_TYPE);
        float partialTick = event.getPartialTick();

        Iterator<WaveVisual> iterator = ACTIVE_WAVES.iterator();
        while (iterator.hasNext()) {
            WaveVisual wave = iterator.next();
            float elapsedTicks = level.getGameTime() - wave.startedAt + partialTick;
            double currentRadius = Math.min(wave.radius,
                    elapsedTicks * MedusaItem.PETRIFICATION_WAVE_BLOCKS_PER_TICK);
            if (currentRadius <= 0.0D) continue;

            poseStack.pushPose();
            poseStack.translate(wave.center.x - cameraPos.x,
                    wave.center.y - cameraPos.y,
                    wave.center.z - cameraPos.z);
            renderSphere(vertices, poseStack, currentRadius);
            poseStack.popPose();

            // Render the final outer shell once, then remove this completed visual.
            if (currentRadius >= wave.radius) {
                iterator.remove();
            }
        }

        buffers.endBatch(WAVE_RENDER_TYPE);
    }

    private static void renderSphere(VertexConsumer vertices, PoseStack poseStack, double radius) {
        for (int latitude = 0; latitude < LATITUDE_SEGMENTS; latitude++) {
            double phi0 = Math.PI * latitude / LATITUDE_SEGMENTS;
            double phi1 = Math.PI * (latitude + 1) / LATITUDE_SEGMENTS;
            float v0 = latitude / (float) LATITUDE_SEGMENTS;
            float v1 = (latitude + 1) / (float) LATITUDE_SEGMENTS;

            for (int longitude = 0; longitude < LONGITUDE_SEGMENTS; longitude++) {
                double theta0 = Math.PI * 2.0D * longitude / LONGITUDE_SEGMENTS;
                double theta1 = Math.PI * 2.0D * (longitude + 1) / LONGITUDE_SEGMENTS;
                float u0 = longitude / (float) LONGITUDE_SEGMENTS;
                float u1 = (longitude + 1) / (float) LONGITUDE_SEGMENTS;

                SphereVertex topLeft = SphereVertex.of(phi0, theta0, radius, u0, v0);
                SphereVertex bottomLeft = SphereVertex.of(phi1, theta0, radius, u0, v1);
                SphereVertex bottomRight = SphereVertex.of(phi1, theta1, radius, u1, v1);
                SphereVertex topRight = SphereVertex.of(phi0, theta1, radius, u1, v0);

                // Exterior and interior are both drawn, so the shell remains visible
                // when the player is already inside the expanding sphere.
                addVertex(vertices, poseStack, topLeft, false);
                addVertex(vertices, poseStack, bottomLeft, false);
                addVertex(vertices, poseStack, bottomRight, false);
                addVertex(vertices, poseStack, topRight, false);

                addVertex(vertices, poseStack, topRight, true);
                addVertex(vertices, poseStack, bottomRight, true);
                addVertex(vertices, poseStack, bottomLeft, true);
                addVertex(vertices, poseStack, topLeft, true);
            }
        }
    }

    private static void addVertex(VertexConsumer vertices, PoseStack poseStack,
                                  SphereVertex vertex, boolean inwardNormal) {
        float normalMultiplier = inwardNormal ? -1.0F : 1.0F;
        PoseStack.Pose pose = poseStack.last();
        vertices.vertex(pose.pose(), vertex.x, vertex.y, vertex.z)
                .color(125, 238, 190, 170)
                .uv(vertex.u, vertex.v)
                .overlayCoords(OverlayTexture.NO_OVERLAY)
                .uv2(LightTexture.FULL_BRIGHT)
                .normal(pose.normal(), vertex.normalX * normalMultiplier,
                        vertex.normalY * normalMultiplier, vertex.normalZ * normalMultiplier)
                .endVertex();
    }

    private record WaveVisual(Vec3 center, int radius, long startedAt) {
    }

    private record SphereVertex(float x, float y, float z,
                                float normalX, float normalY, float normalZ,
                                float u, float v) {
        private static SphereVertex of(double phi, double theta, double radius, float u, float v) {
            double sinPhi = Math.sin(phi);
            float x = (float) (sinPhi * Math.cos(theta));
            float y = (float) Math.cos(phi);
            float z = (float) (sinPhi * Math.sin(theta));
            return new SphereVertex((float) (x * radius), (float) (y * radius), (float) (z * radius),
                    x, y, z, u, v);
        }
    }
}
