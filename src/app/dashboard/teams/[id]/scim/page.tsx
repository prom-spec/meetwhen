"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Check, RefreshCw, Key, Shield } from "lucide-react";
import Link from "next/link";
import PlanGate from "@/components/PlanGate"

export default function SCIMSettingsPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const scimUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/scim/v2`;

  useEffect(() => {
    // We can't check if token exists without exposing it,
    // so we just show the generate button
  }, []);

  const generateToken = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scim/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setHasToken(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <PlanGate feature="scim" featureLabel="SCIM Provisioning" description="Automatically provision and deprovision team members from your identity provider.">
    <div className="max-w-3xl mx-auto p-6">
      <Link
        href={`/dashboard/teams/${teamId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Team
      </Link>

      <h1 className="text-2xl font-bold mb-2">SCIM Provisioning</h1>
      <p className="text-gray-600 mb-8">
        Configure SCIM 2.0 to automatically sync users from your identity
        provider (Okta, Azure AD, OneLogin, etc.)
      </p>

      {/* SCIM Endpoint */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5" /> SCIM Endpoint URL
        </h2>
        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded font-mono text-sm">
          <span className="flex-1 truncate">{scimUrl}</span>
          <button
            onClick={() => copyToClipboard(scimUrl, setCopiedUrl)}
            className="p-1.5 hover:bg-gray-200 rounded"
          >
            {copiedUrl ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Token Management */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Key className="w-5 h-5" /> Bearer Token
        </h2>

        {token && (
          <div className="mb-4">
            <p className="text-sm text-amber-600 mb-2">
              ⚠️ Copy this token now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-3 rounded font-mono text-xs">
              <span className="flex-1 break-all">{token}</span>
              <button
                onClick={() => copyToClipboard(token, setCopied)}
                className="p-1.5 hover:bg-amber-100 rounded flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={generateToken}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {hasToken ? "Regenerate Token" : "Generate SCIM Token"}
        </button>
        {hasToken && (
          <p className="text-xs text-gray-500 mt-2">
            Regenerating will invalidate the previous token.
          </p>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Setup Instructions</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Okta</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>In Okta Admin, go to Applications → Create App Integration</li>
              <li>Select SCIM 2.0 (SWA or SAML app with SCIM provisioning)</li>
              <li>Set SCIM connector base URL to: <code className="bg-gray-100 px-1 rounded">{scimUrl}</code></li>
              <li>Set Authentication Mode to &quot;HTTP Header&quot; and paste the Bearer token</li>
              <li>Enable &quot;Push New Users&quot; and &quot;Push Profile Updates&quot;</li>
            </ol>
          </div>

          <div>
            <h3 className="font-medium mb-2">Azure AD (Entra ID)</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>In Azure Portal → Enterprise Applications → Your App → Provisioning</li>
              <li>Set Provisioning Mode to &quot;Automatic&quot;</li>
              <li>Set Tenant URL to: <code className="bg-gray-100 px-1 rounded">{scimUrl}</code></li>
              <li>Set Secret Token to the Bearer token generated above</li>
              <li>Click &quot;Test Connection&quot; then &quot;Save&quot;</li>
              <li>Configure attribute mappings and start provisioning</li>
            </ol>
          </div>

          <div>
            <h3 className="font-medium mb-2">OneLogin</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>In OneLogin Admin → Applications → Add App → SCIM Provisioner</li>
              <li>Under Configuration, set SCIM Base URL to: <code className="bg-gray-100 px-1 rounded">{scimUrl}</code></li>
              <li>Set SCIM Bearer Token to the token generated above</li>
              <li>Enable provisioning under the Provisioning tab</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
    </PlanGate>
  );
}
