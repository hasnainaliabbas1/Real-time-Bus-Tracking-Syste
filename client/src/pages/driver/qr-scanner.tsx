import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, QrCode, Check, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function QrScanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);

  // Validate ticket mutation
  const validateTicketMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const res = await apiRequest("POST", "/api/tickets/validate", { qrCode });
      return res.json();
    },
    onSuccess: (data) => {
      setScanResult(data);
      
      // Add to scan history
      setScanHistory(prev => [
        {
          time: new Date(),
          valid: data.valid,
          ticket: data.ticket,
        },
        ...prev.slice(0, 4), // Keep only the last 5 scans
      ]);
      
      toast({
        title: data.valid ? "Valid Ticket" : "Invalid Ticket",
        description: data.valid ? "The ticket is valid." : "The ticket is invalid or expired.",
        variant: data.valid ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Validation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize camera
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        setCameraPermissionDenied(false);
      }
    } catch (error) {
      console.error("Camera permission denied or not available:", error);
      setCameraPermissionDenied(true);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to scan QR codes.",
        variant: "destructive",
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setScanning(false);
    }
  };

  // Restart scanning
  const restartScanning = () => {
    setScanResult(null);
    startCamera();
  };

  // Scan QR code from video frame
  const scanQRCode = () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // In a real implementation, we would use a QR code library here
    // to scan the image from the canvas. For this demo, we'll simulate scanning
    // by generating a random QR code.
    const mockQRCode = `TICKET-${Math.random().toString(36).substring(2, 12)}`;
    
    // Stop the camera and validate the QR code
    stopCamera();
    validateTicketMutation.mutate(mockQRCode);
  };

  // Start camera when component mounts
  useEffect(() => {
    startCamera();
    
    // Clean up on unmount
    return () => {
      stopCamera();
    };
  }, []);

  // Scan every 2 seconds while scanning is active
  useEffect(() => {
    let interval: number;
    
    if (scanning) {
      interval = window.setInterval(() => {
        scanQRCode();
      }, 2000);
    }
    
    return () => {
      clearInterval(interval);
    };
  }, [scanning]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/driver">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="ml-2 text-xl font-semibold text-gray-900">Ticket Scanner</h1>
            </div>
            <div className="text-sm text-gray-500">
              Driver: {user?.fullName || user?.username}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Scanner Section */}
          <div className="md:col-span-2">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>QR Code Scanner</CardTitle>
                <CardDescription>
                  Point the camera at the passenger's ticket QR code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {cameraPermissionDenied ? (
                    <div className="bg-gray-100 h-64 rounded-md flex items-center justify-center">
                      <div className="text-center">
                        <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">Camera access denied. Please allow camera access to scan QR codes.</p>
                        <Button onClick={() => startCamera()}>
                          Request Camera Access
                        </Button>
                      </div>
                    </div>
                  ) : scanResult ? (
                    <div className="bg-gray-100 h-64 rounded-md flex items-center justify-center">
                      <div className="text-center">
                        {scanResult.valid ? (
                          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <Check className="h-8 w-8 text-green-600" />
                          </div>
                        ) : (
                          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                            <X className="h-8 w-8 text-red-600" />
                          </div>
                        )}
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {scanResult.valid ? "Valid Ticket" : "Invalid Ticket"}
                        </h3>
                        {scanResult.ticket && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-500">
                              {scanResult.ticket.route?.name || "Unknown Route"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {scanResult.ticket.fromStop?.name || "Unknown"} → {scanResult.ticket.toStop?.name || "Unknown"}
                            </p>
                            <p className="text-sm font-medium mt-2">
                              {scanResult.ticket.user?.fullName || scanResult.ticket.user?.username || "Unknown User"}
                            </p>
                          </div>
                        )}
                        <Button onClick={restartScanning}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Scan Another
                        </Button>
                      </div>
                    </div>
                  ) : validateTicketMutation.isPending ? (
                    <div className="bg-gray-100 h-64 rounded-md flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
                        <p className="text-gray-500">Validating ticket...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <video 
                        ref={videoRef}
                        autoPlay 
                        playsInline 
                        className="w-full h-64 object-cover rounded-md"
                      ></video>
                      <div className="absolute inset-0 border-2 border-dashed border-primary-400 rounded-md pointer-events-none"></div>
                      <canvas ref={canvasRef} className="hidden"></canvas>
                    </>
                  )}
                </div>
                
                <div className="mt-4 flex justify-center">
                  {!scanResult && !validateTicketMutation.isPending && (
                    <Button
                      onClick={scanQRCode}
                      disabled={!scanning || cameraPermissionDenied}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Scan QR Code
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scan History */}
          <div>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Recent Scans</CardTitle>
                <CardDescription>
                  History of recently scanned tickets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scanHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <QrCode className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No recent scans</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scanHistory.map((scan, index) => (
                      <div key={index} className="border rounded-md p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center">
                              {scan.valid ? (
                                <Check className="h-4 w-4 text-green-600 mr-2" />
                              ) : (
                                <X className="h-4 w-4 text-red-600 mr-2" />
                              )}
                              <span className="font-medium">
                                {scan.valid ? "Valid" : "Invalid"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(scan.time).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {scan.ticket?.route?.name || "Unknown Route"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {scan.ticket?.user?.username || "Unknown User"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
