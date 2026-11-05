import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  firestoreDetails: string | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      firestoreDetails: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let firestoreDetails: string | null = null;
    let errorMessage = error?.message || 'An unexpected application error occurred.';
    try {
      const parsed = JSON.parse(errorMessage);
      if (parsed && parsed.operationType) {
        errorMessage = `Firestore ${parsed.operationType} error on ${parsed.path || 'unknown path'}: ${parsed.error}`;
        firestoreDetails = JSON.stringify(parsed, null, 2);
      }
    } catch {
      // Not a JSON FirestoreErrorInfo string
    }
    return {
      hasError: true,
      errorMessage,
      firestoreDetails,
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070A12] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0E1525] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-7 h-7 shrink-0" />
              <h2 className="text-lg font-bold">Application Recovery Guard</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{this.state.errorMessage}</p>
            {this.state.firestoreDetails && (
              <pre className="text-[11px] font-mono bg-black/50 p-3 rounded-xl overflow-x-auto text-rose-300 border border-white/10">
                {this.state.firestoreDetails}
              </pre>
            )}
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '', firestoreDetails: null });
                window.location.reload();
              }}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Reload FlashTalk
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
