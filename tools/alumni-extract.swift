// Cuts the person out of a "Gương mặt Alumni" poster and reads its text, on this Mac
// (Apple Vision; nothing is uploaded). macOS 14+.
//
//   swiftc -O tools/alumni-extract.swift -o /tmp/alumni-extract
//   /tmp/alumni-extract /tmp/out a28=~/Downloads/28.png b16=~/Downloads/16.png
//
// For each poster: <id>.png = the person (transparent background, the poster's gold
// wave removed); <id>.json = the text lines (titles, name, cohort), top to bottom.
// Proofread the text (diacritics), trim/resize the PNG (about 900 px tall), save it
// as WebP in assets/alumni/<group>/ and add an entry to assets/alumni/alumni.json.
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let outDir = URL(fileURLWithPath: args[1])
let ctx = CIContext()

func load(_ path: String) -> CGImage {
  let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil)!
  return CGImageSourceCreateImageAtIndex(src, 0, nil)!
}
func crop(_ img: CGImage, x0: Double, y0: Double, x1: Double, y1: Double) -> CGImage {
  let w = Double(img.width), h = Double(img.height)
  return img.cropping(to: CGRect(x: x0*w, y: y0*h, width: (x1-x0)*w, height: (y1-y0)*h))!
}
func writePNG(_ ci: CIImage, _ url: URL) {
  let cg = ctx.createCGImage(ci, from: ci.extent)!
  let dst = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dst, cg, nil); CGImageDestinationFinalize(dst)
}

for pair in args.dropFirst(2) {
  let parts = pair.split(separator: "=", maxSplits: 1).map(String.init)
  let id = parts[0], path = parts[1]
  let poster = load(path)

  // ---- person: right part of the poster, above the footer
  let region = crop(poster, x0: 0.48, y0: 0.22, x1: 1.0, y1: 0.885)
  let h = VNImageRequestHandler(cgImage: region, options: [:])
  let req = VNGenerateForegroundInstanceMaskRequest()
  do {
    try h.perform([req])
    if let obs = req.results?.first {
      var best = -1, bestArea = 0
      for i in obs.allInstances {
        let m = try obs.generateScaledMaskForImage(forInstances: IndexSet(integer: i), from: h)
        CVPixelBufferLockBaseAddress(m, .readOnly)
        let w = CVPixelBufferGetWidth(m), hh = CVPixelBufferGetHeight(m), rb = CVPixelBufferGetBytesPerRow(m)
        let base = CVPixelBufferGetBaseAddress(m)!.assumingMemoryBound(to: Float32.self)
        var area = 0
        for y in stride(from: 0, to: hh, by: 4) { for x in stride(from: 0, to: w, by: 4) { if base[y*(rb/4)+x] > 0.5 { area += 1 } } }
        CVPixelBufferUnlockBaseAddress(m, .readOnly)
        if area > bestArea { bestArea = area; best = i }
      }
      if best >= 0 {
        // crisp cut of the main subject (may include the poster's gold wave where it touches the person)
        let px = try obs.generateMaskedImage(ofInstances: IndexSet(integer: best), from: h, croppedToInstancesExtent: false)
        let subject = CIImage(cvPixelBuffer: px)
        // people-only mask, slightly grown and softened, to drop the wave
        let preq = VNGeneratePersonSegmentationRequest()
        preq.qualityLevel = .accurate
        preq.outputPixelFormat = kCVPixelFormatType_OneComponent8
        try h.perform([preq])
        var out = subject
        if let pm = preq.results?.first?.pixelBuffer {
          var mask = CIImage(cvPixelBuffer: pm)
          mask = mask.transformed(by: CGAffineTransform(scaleX: subject.extent.width / mask.extent.width,
                                                        y: subject.extent.height / mask.extent.height))
          mask = mask.applyingFilter("CIMorphologyMaximum", parameters: ["inputRadius": 6])
                     .applyingGaussianBlur(sigma: 2.5).cropped(to: subject.extent)
          let clear = CIImage(color: .clear).cropped(to: subject.extent)
          out = subject.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: clear, kCIInputMaskImageKey: mask])
        }
        writePNG(out, outDir.appendingPathComponent("\(id).png"))
      }
      print(id, "instances", obs.allInstances.count, "picked", best)
    } else { print(id, "NO PERSON") }
  } catch { print(id, "cut error", error) }

  // ---- text: left part (titles, name pill, cohort)
  let tregion = crop(poster, x0: 0.0, y0: 0.27, x1: 0.70, y1: 0.80)
  let th = VNImageRequestHandler(cgImage: tregion, options: [:])
  let treq = VNRecognizeTextRequest()
  treq.recognitionLevel = .accurate
  treq.recognitionLanguages = ["vi-VT"]
  treq.usesLanguageCorrection = true
  try? th.perform([treq])
  let lines = (treq.results ?? []).sorted { $0.boundingBox.midY > $1.boundingBox.midY }.compactMap { o -> [String: Any]? in
    guard let t = o.topCandidates(1).first else { return nil }
    return ["text": t.string, "y": 1 - o.boundingBox.midY, "h": o.boundingBox.height, "conf": t.confidence]
  }
  let data = try! JSONSerialization.data(withJSONObject: lines, options: [.prettyPrinted])
  try! data.write(to: outDir.appendingPathComponent("\(id).json"))
}
