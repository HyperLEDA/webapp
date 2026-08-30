import { ReactElement, useEffect, useRef } from "react";
import {
  NavigateFunction,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { MdMyLocation } from "react-icons/md";
import { SearchBar } from "../components/ui/Searchbar";
import {
  CommonTable,
  Column,
  ErrorPage,
  Loading,
  Pagination,
} from "@leda/lib/ui";
import { PgcObject } from "@leda/lib/clients/backend";
import {
  AladinViewer,
  Declination,
  Link,
  RightAscension,
  type AladinViewerHandle,
} from "@leda/lib/ui";
import { Button } from "@leda/lib/ui";
import {
  SearchSectionState,
  useMultiSearch,
} from "../lib/search/useMultiSearch";

const MIN_ALADIN_FOV_DEG = 0.05;
const ALADIN_FOV_PADDING = 1.4;

function searchHandler(navigate: NavigateFunction) {
  return function f(query: string) {
    void navigate(`/query?q=${encodeURIComponent(query)}`);
  };
}

function pageChangeHandler(
  navigate: NavigateFunction,
  query: string,
  pageSize: number,
  newPage: number,
) {
  void navigate(
    `/query?q=${encodeURIComponent(query)}&page=${newPage}&pagesize=${pageSize}`,
  );
}

type SkySource = {
  ra: number;
  dec: number;
  label: string;
  id: number;
};

type SkyView = {
  ra: number;
  dec: number;
  fov: number;
};

function objectsToSkySources(objects: PgcObject[]): SkySource[] {
  return objects.flatMap((object) => {
    const coordinates = object.catalogs.coordinates;
    if (coordinates === null || coordinates === undefined) {
      return [];
    }

    return [
      {
        ra: coordinates.equatorial.ra,
        dec: coordinates.equatorial.dec,
        label: object.catalogs.designation?.name || `PGC ${object.pgc}`,
        id: object.pgc,
      },
    ];
  });
}

function skyViewForSources(sources: SkySource[]): SkyView | null {
  if (sources.length === 0) {
    return null;
  }

  const ra =
    sources.reduce((sum, source) => sum + source.ra, 0) / sources.length;
  const dec =
    sources.reduce((sum, source) => sum + source.dec, 0) / sources.length;

  if (sources.length === 1) {
    return { ra, dec, fov: MIN_ALADIN_FOV_DEG };
  }

  const raSpan =
    Math.max(...sources.map((source) => source.ra)) -
    Math.min(...sources.map((source) => source.ra));
  const decSpan =
    Math.max(...sources.map((source) => source.dec)) -
    Math.min(...sources.map((source) => source.dec));
  const fov =
    Math.max(raSpan, decSpan, MIN_ALADIN_FOV_DEG) * ALADIN_FOV_PADDING;

  return { ra, dec, fov };
}

function isNumericCell(
  value: React.ReactElement | string | number,
): value is number {
  return Number.isFinite(value);
}

function resultTableColumns(): Column[] {
  return [
    { slug: "", width: "fit" },
    {
      slug: "PGC",
      renderCell: (value: React.ReactElement | string | number) =>
        isNumericCell(value) ? (
          <Link href={`/object/${value}`}>{value}</Link>
        ) : (
          value
        ),
    },
    { slug: "Name" },
    { slug: "Type" },
    { slug: "Velocity" },
    {
      slug: "RA",
      renderCell: (value: React.ReactElement | string | number) =>
        isNumericCell(value) ? <RightAscension value={value} /> : value,
    },
    {
      slug: "Dec",
      renderCell: (value: React.ReactElement | string | number) =>
        isNumericCell(value) ? <Declination value={value} /> : value,
    },
  ];
}

function objectsToTableData(
  objects: PgcObject[],
  onLocate: (ra: number, dec: number) => void,
) {
  return objects.map((object) => {
    const coordinates = object.catalogs.coordinates;
    const hasCoords = coordinates !== undefined && coordinates !== null;

    return {
      "": hasCoords ? (
        <Button
          type="button"
          transparent
          hoverText="Locate"
          onClick={(event) => {
            event.stopPropagation();
            onLocate(coordinates.equatorial.ra, coordinates.equatorial.dec);
          }}
        >
          <MdMyLocation className="w-4 h-4 text-muted" />
        </Button>
      ) : (
        <div />
      ),
      PGC: object.pgc,
      Name: object.catalogs.designation?.name || "N/A",
      Type: object.catalogs.nature?.type_name || "N/A",
      Velocity:
        object.catalogs.velocity?.heliocentric !== undefined
          ? `${object.catalogs.velocity.heliocentric.v.toFixed(0)} km/s`
          : "N/A",
      RA: hasCoords ? coordinates.equatorial.ra : "N/A",
      Dec: hasCoords ? coordinates.equatorial.dec : "N/A",
    };
  });
}

interface SearchSectionContentProps {
  section: SearchSectionState;
  columns: Column[];
  page: number;
  pageSize: number;
  onLocate: (ra: number, dec: number) => void;
  onPageChange: (newPage: number) => void;
}

function SearchSectionContent({
  section,
  columns,
  page,
  pageSize,
  onLocate,
  onPageChange,
}: SearchSectionContentProps): ReactElement {
  if (section.status === "loading") {
    return <Loading className="py-4" />;
  }

  if (section.status === "empty") {
    return <p className="text-subtle">No objects found for this search.</p>;
  }

  if (section.status === "error") {
    return <p className="text-error">{section.message}</p>;
  }

  return (
    <>
      <CommonTable
        columns={columns}
        data={objectsToTableData(section.results.objects, onLocate)}
        className="w-full"
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        records={section.results.objects}
        handlePageChange={onPageChange}
      />
    </>
  );
}

interface SearchResultsProps {
  sections: SearchSectionState[];
  query: string;
  page: number;
  pageSize: number;
  navigate: NavigateFunction;
}

function SearchResults({
  sections,
  query,
  page,
  pageSize,
  navigate,
}: SearchResultsProps): ReactElement {
  const columns = resultTableColumns();
  const aladinRef = useRef<AladinViewerHandle>(null);

  const loadedObjects = sections.flatMap((section) =>
    section.status === "success" ? section.results.objects : [],
  );
  const skySources = objectsToSkySources(loadedObjects);
  const skyView = skyViewForSources(skySources);

  function handlePageChange(newPage: number): void {
    pageChangeHandler(navigate, query, pageSize, newPage);
  }

  function handleLocate(ra: number, dec: number): void {
    aladinRef.current?.locate(ra, dec, MIN_ALADIN_FOV_DEG);
  }

  return (
    <div className="space-y-6">
      {skyView ? (
        <AladinViewer
          ref={aladinRef}
          ra={skyView.ra}
          dec={skyView.dec}
          fov={skyView.fov}
          className="w-full h-72"
          additionalSources={skySources}
          onSourceClick={(id) =>
            window.open(`/object/${id}`, "_blank", "noopener,noreferrer")
          }
        />
      ) : null}
      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <SearchSectionContent
            section={section}
            columns={columns}
            page={page}
            pageSize={pageSize}
            onLocate={handleLocate}
            onPageChange={handlePageChange}
          />
        </section>
      ))}
    </div>
  );
}

interface SearchPageContentProps {
  sections: SearchSectionState[];
  pageError: string | null;
  query: string;
  page: number;
  pageSize: number;
  navigate: NavigateFunction;
}

function SearchPageContent({
  sections,
  pageError,
  query,
  page,
  pageSize,
  navigate,
}: SearchPageContentProps): ReactElement {
  if (pageError) {
    return <ErrorPage message={pageError} />;
  }

  return (
    <SearchResults
      sections={sections}
      query={query}
      page={page}
      pageSize={pageSize}
      navigate={navigate}
    />
  );
}

export function SearchResultsPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "0");
  const pageSize = parseInt(searchParams.get("pagesize") || "25");

  useEffect(() => {
    document.title = `${query} | LEDA`;
  }, [query]);

  const { sections, pageError } = useMultiSearch(query, page, pageSize);

  return (
    <>
      <SearchBar
        initialValue={query}
        onSearch={searchHandler(navigate)}
        logoSize="small"
      />
      <SearchPageContent
        sections={sections}
        pageError={pageError}
        query={query}
        page={page}
        pageSize={pageSize}
        navigate={navigate}
      />
    </>
  );
}
