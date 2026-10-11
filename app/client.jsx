"use client";
import dynamic from "next/dynamic";
const Storefront = dynamic(() => import("../src/tweentees/app"), {
  ssr: false,
  loading: () => (
    <div className="loading" role="status">
      Loading TweenTees…
    </div>
  ),
});
export default function Client() {
  return <Storefront />;
}
