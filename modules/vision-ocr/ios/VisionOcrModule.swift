// On-device receipt OCR via Apple's Vision framework (research §1). Exposed to JS as
// the `VisionOcr` Expo module with a single async `recognizeText(uri)` function.
// Runs entirely on-device with no network call (unlike the later Claude step).

import ExpoModulesCore
import Vision
import UIKit

public class VisionOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VisionOcr")

    // Recognize text in the image at `uri` (a file:// or asset URL). Returns the
    // recognized lines joined by newlines, top-to-bottom. AsyncFunction hops to a
    // background queue, so the synchronous Vision request below does not block JS.
    AsyncFunction("recognizeText") { (uri: String) -> String in
      guard let url = URL(string: uri) else {
        throw VisionOcrError.invalidUri(uri)
      }
      guard let data = try? Data(contentsOf: url),
            let image = UIImage(data: data),
            let cgImage = image.cgImage else {
        throw VisionOcrError.unreadableImage(uri)
      }

      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      try handler.perform([request])

      let observations = request.results ?? []
      let lines = observations.compactMap { $0.topCandidates(1).first?.string }
      return lines.joined(separator: "\n")
    }
  }
}

private enum VisionOcrError: Error, LocalizedError {
  case invalidUri(String)
  case unreadableImage(String)

  var errorDescription: String? {
    switch self {
    case .invalidUri(let uri): return "Invalid image URI: \(uri)"
    case .unreadableImage(let uri): return "Could not read image at: \(uri)"
    }
  }
}
