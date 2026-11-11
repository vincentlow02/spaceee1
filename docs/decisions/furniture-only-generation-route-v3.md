# Furniture-only material generation route V3

Status: frozen as the active generation route on 2026-11-11.

## Runtime contract

- `POST /api/generate-space` uses the direct furniture-only material application flow.
- Prompt version: `furniture-only-material-application-v3`.
- Provider/model: Alibaba Cloud Model Studio, `qwen-image-2.1-turbo`, through the international endpoint.
- One Qwen Image Edit request returns one image at `1536*1024`; prompt extension and watermark are disabled.
- Inputs are one furnished room base and three approved material reference images. The prompt assigns each material once to one of the space's three named furniture targets.
- Preserve the furnished base's layout, architecture, camera, furniture positions and non-target surfaces. Do not add atmosphere redesign or material spillover.
- Keep the current six-space target definitions and fail-closed approval, image identity, deduplication, quota and persistence checks.

Treat this prompt and route as frozen for the current release. Any later optimization should be an explicitly versioned follow-up; do not silently change V3.

## Observed generation cost

The six-space V3 run produced one output per space. Alibaba's published Singapore/international price for `qwen-image-2.1-turbo` is CNY 0.113362 per generated image. That makes the list-price estimate CNY 0.113362 per space generation and CNY 0.680172 for six outputs. Actual billing may differ due to account promotions, credits, tax, or currency conversion; the local generation receipts record the model and output count, not the provider invoice.

Source: [Alibaba Cloud Model Studio pricing](https://help.aliyun.com/en/model-studio/qwen-image-2-1-turbo).
