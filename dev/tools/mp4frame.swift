// mp4'ten belirli saniyelerde kare çıkarır (üretilen videoyu gerçekten çözüp bakmak için). Kullanım: swift dev/tools/mp4frame.swift <video.mp4> <çıktı klasörü> 1.5 4 8.4 ...
import Foundation
import AVFoundation
import ImageIO
import UniformTypeIdentifiers
let a = CommandLine.arguments
guard a.count >= 4 else { print("kullanım: mp4frame <video> <klasör> <saniye...>"); exit(2) }
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1])); let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero; gen.appliesPreferredTrackTransform = true
try FileManager.default.createDirectory(atPath: a[2], withIntermediateDirectories: true)
for s in a[3...] {
  guard let t = Double(s) else { continue }
  let img = try gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil)
  let url = URL(fileURLWithPath: a[2]).appendingPathComponent("v-\(s.replacingOccurrences(of: ".", with: "_")).png") as CFURL
  let d = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(d, img, nil); CGImageDestinationFinalize(d)
}
print("tamam")
