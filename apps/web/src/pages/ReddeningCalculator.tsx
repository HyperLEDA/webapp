import { FormEvent, ReactElement, useEffect, useState } from "react";
import {
  calculateReddening,
  listReddeningReferences,
  type ReddeningAtPosition,
  type ReddeningPhotometricSystem,
} from "@leda/lib/clients/backend";
import { backendClient } from "@leda/lib/clients";
import { formatApiError, formatCaughtError } from "@leda/lib/tap";
import { Button, CommonTable, Loading } from "@leda/lib/ui";
import {
  formatCoordinateInspectSummary,
  inspectCoordinateQuery,
  parseCoordinateQuery,
} from "../lib/astronomy/parseCoordinateQuery";

const inputClassName =
  "w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary placeholder:text-muted";

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function ReddeningCalculatorPage(): ReactElement {
  const [systems, setSystems] = useState<ReddeningPhotometricSystem[]>([]);
  const [systemsLoading, setSystemsLoading] = useState(true);
  const [systemsError, setSystemsError] = useState<string | null>(null);
  const [photsys, setPhotsys] = useState("");
  const [coordinatesInput, setCoordinatesInput] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [calculateError, setCalculateError] = useState<string | null>(null);
  const [result, setResult] = useState<ReddeningAtPosition | null>(null);

  const coordinateHint = formatCoordinateInspectSummary(
    inspectCoordinateQuery(coordinatesInput),
  );

  useEffect(() => {
    document.title = "Reddening calculator | LEDA";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSystems(): Promise<void> {
      setSystemsLoading(true);
      setSystemsError(null);

      try {
        const response = await listReddeningReferences({
          client: backendClient,
        });
        if (response.error) {
          throw new Error(formatApiError(response.error));
        }
        if (!response.data) {
          throw new Error("Unexpected empty response");
        }

        const nextSystems = response.data.data.systems;
        if (cancelled) {
          return;
        }

        setSystems(nextSystems);
        if (nextSystems.length > 0) {
          setPhotsys(nextSystems[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setSystemsError(formatCaughtError(err));
        }
      } finally {
        if (!cancelled) {
          setSystemsLoading(false);
        }
      }
    }

    void loadSystems();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setCalculateError(null);

    const coordinateQuery = parseCoordinateQuery(coordinatesInput);
    if (!coordinateQuery) {
      setCalculateError(
        'Enter valid J2000 equatorial coordinates (e.g. J123049.42+122328.0, 12h 30m 49.42s +12d 23m 28.0", or 189.0866 +25.9875).',
      );
      return;
    }

    if (coordinateQuery.system !== "j2000") {
      setCalculateError(
        "Reddening calculation requires J2000 equatorial coordinates.",
      );
      return;
    }

    if (!photsys) {
      setCalculateError("Select a photometric system.");
      return;
    }

    const ra = coordinateQuery.lon;
    const dec = coordinateQuery.lat;

    setCalculating(true);

    try {
      const response = await calculateReddening({
        client: backendClient,
        body: {
          photsys,
          coordinates: [{ ra, dec }],
        },
      });

      if (response.error) {
        throw new Error(formatApiError(response.error));
      }

      setResult(response.data.data.results[0]);
    } catch (err) {
      setCalculateError(formatCaughtError(err));
    } finally {
      setCalculating(false);
    }
  }

  const filterRows = (result?.filters ?? []).map((entry) => ({
    filter: entry.filter,
    wavelength: formatNumber(entry.wavelength),
    a: formatNumber(entry.a),
  }));

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold mb-4">Reddening calculator</h2>
        <p className="text-sm text-muted">
          Calculator for extinctions based on Schlegel, Finkbeiner &amp; Davis
          (1998) map.
        </p>
      </div>

      {systemsLoading ? (
        <Loading />
      ) : systemsError ? (
        <p className="text-danger text-sm" role="alert">
          {systemsError}
        </p>
      ) : systems.length === 0 ? (
        <p className="text-muted text-sm" role="status">
          No photometric systems are available for reddening calculation.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="photsys" className="block mb-1 text-subtle">
              Photometric system
            </label>
            <select
              id="photsys"
              value={photsys}
              onChange={(event) => setPhotsys(event.target.value)}
              className={inputClassName}
              disabled={calculating}
            >
              {systems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="coordinates" className="block mb-1 text-subtle">
              Coordinates (J2000)
            </label>
            <input
              id="coordinates"
              type="text"
              required
              value={coordinatesInput}
              onChange={(event) => setCoordinatesInput(event.target.value)}
              placeholder="189.0866 +25.9875"
              className={inputClassName}
              disabled={calculating}
            />
            {coordinateHint ? (
              <p className="mt-1 text-sm text-muted">{coordinateHint}</p>
            ) : null}
          </div>

          <Button type="submit" disabled={calculating}>
            {calculating ? "Calculating…" : "Calculate"}
          </Button>

          {calculateError ? (
            <p className="text-danger text-sm" role="alert">
              {calculateError}
            </p>
          ) : null}
        </form>
      )}

      {result ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-semibold mb-2">Results</h3>
            <p className="text-primary">E(B-V) = {formatNumber(result.ebv)}</p>
          </div>
          <CommonTable
            columns={[
              {
                slug: "filter",
                label: "Filter",
                width: "fit",
                hint: (
                  <p>
                    Common filter designation in the selected photometric
                    system.
                  </p>
                ),
              },
              {
                slug: "wavelength",
                label: "λ_eff (Å)",
                width: "fit",
                hint: (
                  <p>
                    Throughput-weighted mean wavelength of the bandpass, in
                    ångströms.
                  </p>
                ),
              },
              {
                slug: "a",
                label: "A_λ (mag)",
                width: "fit",
                hint: (
                  <p>
                    Galactic extinction in this band, in magnitudes. A_λ = a_EBV
                    × E(B−V), using Fitzpatrick (1999) coefficients with R_V =
                    3.1.
                  </p>
                ),
              },
            ]}
            data={filterRows}
          />
        </div>
      ) : null}
    </div>
  );
}
