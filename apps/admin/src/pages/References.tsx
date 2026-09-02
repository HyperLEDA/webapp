import { ReactElement, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listReferences } from "../clients/admin";
import type {
  ListReferencesResponse,
  ReferenceResourceDescriptor,
} from "../clients/admin";
import { adminClient } from "../clients";
import { Card, ErrorPage, Field, Link, Loading } from "@leda/lib/ui";
import { useDataFetching } from "@leda/lib/hooks";
import { formatApiError } from "@leda/lib/tap";
import { referenceTableKey } from "../components/ui/referenceValues";

async function fetchReferences(): Promise<ListReferencesResponse> {
  const response = await listReferences({ client: adminClient });
  if (response.error) {
    throw new Error(formatApiError(response.error));
  }
  if (!response.data) {
    throw new Error("Unknown error");
  }
  return response.data.data;
}

function ReferenceTableCard({
  reference,
}: {
  reference: ReferenceResourceDescriptor;
}): ReactElement {
  const tablePath = `/references/${encodeURIComponent(reference.schema)}/${encodeURIComponent(reference.table)}`;

  return (
    <Card
      title={
        <Link href={tablePath} className="hover:opacity-80">
          {reference.description ||
            referenceTableKey(reference.schema, reference.table)}
        </Link>
      }
      className="w-full"
      variant="responsive-fields"
    >
      <Field label="Schema">
        <span className="font-mono break-all">{reference.schema}</span>
      </Field>
      <Field label="Table">
        <span className="font-mono break-all">{reference.table}</span>
      </Field>
      <Field label="Fields">{reference.fields.length}</Field>
    </Card>
  );
}

export function ReferencesPage(): ReactElement {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "References | LEDA";
  }, []);

  const { data, loading, error } = useDataFetching(fetchReferences, []);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorPage title="Error" message={error} />;
  }

  if (!data?.references.length) {
    return <ErrorPage title="Error" message="No reference tables available" />;
  }

  if (data.references.length === 1) {
    const reference = data.references[0];
    void navigate(
      `/references/${encodeURIComponent(reference.schema)}/${encodeURIComponent(reference.table)}`,
      { replace: true },
    );
    return <Loading />;
  }

  return (
    <>
      <h2 className="text-3xl font-bold mb-4">References</h2>
      <p className="text-muted mb-4">
        Choose a reference table to view and edit rows.
      </p>
      <div className="flex w-full flex-col gap-4">
        {data.references.map((reference) => (
          <ReferenceTableCard
            key={referenceTableKey(reference.schema, reference.table)}
            reference={reference}
          />
        ))}
      </div>
    </>
  );
}
