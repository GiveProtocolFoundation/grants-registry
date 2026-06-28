import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Public-Goods Grants Registry" },
  {
    name: "description",
    content:
      "Canonical open dataset of public-goods grants. Searchable web UI plus downloadable snapshots, citable per /grants/<program>/<round>/<grantee>.",
  },
];

export default function Index() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Public-Goods Grants Registry
      </h1>
      <p className="mt-4 text-slate-700">
        A canonical, open dataset of public-goods grants — searchable, citable,
        and downloadable. Built and maintained by the{" "}
        <a
          className="underline"
          href="https://github.com/GiveProtocolFoundation"
        >
          Give Protocol Foundation
        </a>
        .
      </p>
      <p className="mt-4 text-sm text-slate-500">
        Status: v0 scaffold. The data ingest, search, and UI land in follow-up
        tickets. See the README for the v0 scope.
      </p>
    </main>
  );
}
