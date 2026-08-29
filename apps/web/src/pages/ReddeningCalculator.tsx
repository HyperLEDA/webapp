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

const inputClassName =
  "w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary placeholder:text-muted";

function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num)) {
    return null;
  }
  return num;
}

function validateRa(ra: number): string | null {
  if (ra < 0 || ra >= 360) {
    return "RA must be in [0, 360) degrees";
  }
  return null;
}

function validateDec(dec: number): string | null {
  if (dec < -90 || dec > 90) {
    return "Dec must be in [-90, 90] degrees";
  }
  return null;
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function ReddeningCalculatorPage(): ReactElement {
  const [systems, setSystems] = useState<ReddeningPhotometricSystem[]>([]);
  const [systemsLoading, setSystemsLoading] = useState(true);
  const [systemsError, setSystemsError] = useState<string | null>(null);
  const [photsys, setPhotsys] = useState("");
  const [raInput, setRaInput] = useState("");
  const [decInput, setDecInput] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [calculateError, setCalculateError] = useState<string | null>(null);
  const [result, setResult] = useState<ReddeningAtPosition | null>(null);

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

    const ra = parseCoordinate(raInput);
    const dec = parseCoordinate(decInput);

    if (ra === null || dec === null) {
      setCalculateError("Enter valid numeric RA and Dec values in degrees.");
      return;
    }

    const raError = validateRa(ra);
    if (raError) {
      setCalculateError(raError);
      return;
    }

    const decError = validateDec(dec);
    if (decError) {
      setCalculateError(decError);
      return;
    }

    if (!photsys) {
      setCalculateError("Select a photometric system.");
      return;
    }

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
          Enter J2000 equatorial coordinates in decimal degrees. E(B-V) comes
          from the Schlegel, Finkbeiner &amp; Davis (1998) map; Aλ uses
          Fitzpatrick (1999) coefficients for the selected photometric system
          (Rv = 3.1).
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ra" className="block mb-1 text-subtle">
                RA (degrees, J2000)
              </label>
              <input
                id="ra"
                type="text"
                inputMode="decimal"
                required
                value={raInput}
                onChange={(event) => setRaInput(event.target.value)}
                placeholder="187.6"
                className={inputClassName}
                disabled={calculating}
              />
            </div>
            <div>
              <label htmlFor="dec" className="block mb-1 text-subtle">
                Dec (degrees, J2000)
              </label>
              <input
                id="dec"
                type="text"
                inputMode="decimal"
                required
                value={decInput}
                onChange={(event) => setDecInput(event.target.value)}
                placeholder="15.26"
                className={inputClassName}
                disabled={calculating}
              />
            </div>
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
              { name: "filter", width: "fit" },
              { name: "wavelength", width: "fit" },
              { name: "a", width: "fit" },
            ]}
            data={filterRows}
          />
        </div>
      ) : null}
    </div>
  );
}
