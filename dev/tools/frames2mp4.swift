// PNG kare dizisini (f0000.png, f0001.png, ...) H.264 mp4'e çevirir. macOS'un kendi kodlayıcısını kullanır: ffmpeg kurmak gerekmez.
// Kullanım: swift dev/tools/frames2mp4.swift <kare klasörü> <fps> <çıktı.mp4>
import Foundation
import AVFoundation
import CoreVideo
import ImageIO

let a = CommandLine.arguments
guard a.count == 4, let fps = Int32(a[2]) else { print("kullanım: frames2mp4 <klasör> <fps> <çıktı.mp4>"); exit(2) }
let dir = URL(fileURLWithPath: a[1]), out = URL(fileURLWithPath: a[3])
let files = try FileManager.default.contentsOfDirectory(atPath: a[1]).filter { $0.hasSuffix(".png") }.sorted()
guard !files.isEmpty else { print("klasörde png yok"); exit(2) }
func load(_ n: String) -> CGImage? {
  guard let s = CGImageSourceCreateWithURL(dir.appendingPathComponent(n) as CFURL, nil) else { return nil }
  return CGImageSourceCreateImageAtIndex(s, 0, nil)
}
guard let first = load(files[0]) else { print("ilk kare okunamadı"); exit(2) }
let W = first.width, H = first.height
try? FileManager.default.removeItem(at: out)
let w = try AVAssetWriter(outputURL: out, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 14_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: Int(fps)],
])
input.expectsMediaDataInRealTime = false
let ad = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
w.add(input); w.startWriting(); w.startSession(atSourceTime: .zero)
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
for (i, f) in files.enumerated() {
  guard let img = load(f) else { print("okunamadı:", f); exit(3) }
  while !input.isReadyForMoreMediaData { usleep(2000) }
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, ad.pixelBufferPool!, &pb)
  guard let buf = pb else { print("tampon yok"); exit(3) }
  CVPixelBufferLockBaseAddress(buf, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buf), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buf), space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  CVPixelBufferUnlockBaseAddress(buf, [])
  ad.append(buf, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
}
input.markAsFinished()
let sem = DispatchSemaphore(value: 0)
w.finishWriting { sem.signal() }
sem.wait()
if w.status == .completed { print("tamam:", out.path, "\(files.count) kare, \(W)x\(H), \(fps) fps") } else { print("HATA:", w.error?.localizedDescription ?? "?"); exit(1) }
