import cssnano from "cssnano";
import customMedia from "postcss-custom-media";

const isProd = process.env.NODE_ENV === "production";

export default {
  plugins: [
    // Musi być pierwsze: rozwija @custom-media + @media (--bp-*) do realnych
    // media queries. Tailwind v4 vite plugin tylko pass-through'uje @custom-media
    // (transform robi Lightning CSS, ale tylko przy cssMinify w build). Bez tego
    // w dev @media (--bp-phone) zostaje raw i przeglądarka je dropuje.
    customMedia(),
    isProd &&
      cssnano({
        preset: "default"
      })
  ].filter(Boolean)
};

// UWAGA: Nie dodawaj tutaj postcss-discard-duplicates,
// postcss-combine-duplicated-selectors ani postcss-sort-media-queries.
// Te pluginy psują zagnieżdżoną strukturę Tailwind v4 dla wariantów hover/focus:
//
//   .hover\:text-on-surface {
//     &:hover {
//       @media (hover: hover) { color: ... }
//     }
//   }
//
// — postcss-combine-duplicated-selectors / discardDuplicates "spłaszczają"
//   selektor do samej reguły bez deklaracji, przez co `hover:*` staje się pustą
//   regułą i hover nie działa. Sort-media-queries dodatkowo przestawia
//   @media (hover: hover) poza `&:hover`, łamiąc semantykę wariantu.
// Lightning CSS (wbudowany w Tailwind v4) i tak deduplikuje/sortuje w build.
