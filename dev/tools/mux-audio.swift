// Sessiz bir mp4'e ses (wav/m4a/mp3) ekler. macOS'un kendi kodlayıcısını kullanır: ffmpeg kurmak gerekmez.
// Video yeniden kodlanmaz (olduğu gibi kopyalanır), ses AAC'ye çevrilir.
// Kullanım: swift dev/tools/mux-audio.swift <sessiz.mp4> <ses.wav> <çıktı.mp4>
import Foundation
import AVFoundation

let a = CommandLine.arguments
guard a.count == 4 else { print("kullanım: mux-audio <video.mp4> <ses> <çıktı.mp4>"); exit(2) }
let videoURL = URL(fileURLWithPath: a[1]), audioIn = URL(fileURLWithPath: a[2]), out = URL(fileURLWithPath: a[3])
let tmpM4A = FileManager.default.temporaryDirectory.appendingPathComponent("cv-mux-\(UUID().uuidString).m4a")

func fail(_ m: String) -> Never { print("HATA:", m); exit(1) }

// 1) sesi AAC (m4a) yap
let audioAsset = AVURLAsset(url: audioIn)
guard let enc = AVAssetExportSession(asset: audioAsset, presetName: AVAssetExportPresetAppleM4A) else { fail("ses kodlayıcı açılamadı") }
do { try await enc.export(to: tmpM4A, as: .m4a) } catch { fail("ses kodlanamadı: \(error.localizedDescription)") }

// 2) video + ses birleştir (video olduğu gibi)
let v = AVURLAsset(url: videoURL), au = AVURLAsset(url: tmpM4A)
let comp = AVMutableComposition()
guard let vTrack = try await v.loadTracks(withMediaType: .video).first, let aTrack = try await au.loadTracks(withMediaType: .audio).first else { fail("video ya da ses izi yok") }
let vDur = try await v.load(.duration), aDur = try await au.load(.duration)
let dur = CMTimeMinimum(vDur, aDur)
guard let cv = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid), let ca = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else { fail("kompozisyon kurulamadı") }
try cv.insertTimeRange(CMTimeRange(start: .zero, duration: vDur), of: vTrack, at: .zero)
try ca.insertTimeRange(CMTimeRange(start: .zero, duration: dur), of: aTrack, at: .zero)
try? FileManager.default.removeItem(at: out)
guard let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough) else { fail("dışa aktarıcı açılamadı") }
do { try await ex.export(to: out, as: .mp4) } catch { fail("birleştirilemedi: \(error.localizedDescription)") }
try? FileManager.default.removeItem(at: tmpM4A)
print("tamam:", out.path, String(format: "video %.1f sn, ses %.1f sn", vDur.seconds, aDur.seconds))
