import 'package:flutter/material.dart';

class ParkinsonScreeningScreen extends StatefulWidget {
  const ParkinsonScreeningScreen({super.key});

  @override
  State<ParkinsonScreeningScreen> createState() =>
      _ParkinsonScreeningScreenState();
}

class _ParkinsonScreeningScreenState
    extends State<ParkinsonScreeningScreen> {
  int currentStep = 0;

  final List<ScreeningStep> steps = const [
    ScreeningStep(
      title: 'Voice Assessment',
      subtitle: 'Record a short voice sample for AI analysis.',
      icon: Icons.mic_none_rounded,
    ),
    ScreeningStep(
      title: 'Handwriting Assessment',
      subtitle: 'Provide a handwriting sample for AI analysis.',
      icon: Icons.edit_outlined,
    ),
    ScreeningStep(
      title: 'Gait Assessment',
      subtitle: 'Upload or record a short walking video.',
      icon: Icons.directions_walk_rounded,
    ),
  ];

  void openAssessment() {
    if (currentStep == 0) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => const VoiceAssessmentScreen(),
        ),
      );
    } else if (currentStep == 1) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => const HandwritingAssessmentScreen(),
        ),
      );
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => const GaitAssessmentScreen(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final step = steps[currentStep];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Parkinson\'s Screening'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'AI-Assisted Screening',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              'Complete the three assessments below to generate '
              'your screening result.',
              style: TextStyle(
                fontSize: 15,
                color: Colors.grey[600],
              ),
            ),

            const SizedBox(height: 28),

            Row(
              children: List.generate(
                steps.length,
                (index) => Expanded(
                  child: Container(
                    height: 6,
                    margin: EdgeInsets.only(
                      right: index == steps.length - 1 ? 0 : 6,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      color: index <= currentStep
                          ? Theme.of(context).colorScheme.primary
                          : Colors.grey.shade300,
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 28),

            Text(
              'Step ${currentStep + 1} of ${steps.length}',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),

            const SizedBox(height: 12),

            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Icon(
                      step.icon,
                      size: 70,
                      color: Theme.of(context).colorScheme.primary,
                    ),

                    const SizedBox(height: 20),

                    Text(
                      step.title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),

                    const SizedBox(height: 10),

                    Text(
                      step.subtitle,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.grey[600],
                      ),
                    ),

                    const SizedBox(height: 28),

                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: openAssessment,
                        icon: const Icon(Icons.arrow_forward),
                        label: Text(
                          currentStep == 0
                              ? 'Start Voice Assessment'
                              : currentStep == 1
                                  ? 'Start Handwriting Assessment'
                                  : 'Start Gait Assessment',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            const Text(
              'Assessment Overview',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            ...List.generate(
              steps.length,
              (index) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  child: Icon(steps[index].icon),
                ),
                title: Text(steps[index].title),
                subtitle: Text(
                  index < currentStep
                      ? 'Completed'
                      : index == currentStep
                          ? 'Current assessment'
                          : 'Not started',
                ),
                trailing: index < currentStep
                    ? const Icon(
                        Icons.check_circle,
                        color: Colors.green,
                      )
                    : null,
              ),
            ),

            const Spacer(),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'This screening is for preliminary assessment only '
                'and does not replace professional medical diagnosis.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ScreeningStep {
  final String title;
  final String subtitle;
  final IconData icon;

  const ScreeningStep({
    required this.title,
    required this.subtitle,
    required this.icon,
  });
}


// ------------------------------------------------------------
// VOICE ASSESSMENT
// ------------------------------------------------------------

class VoiceAssessmentScreen extends StatefulWidget {
  const VoiceAssessmentScreen({super.key});

  @override
  State<VoiceAssessmentScreen> createState() =>
      _VoiceAssessmentScreenState();
}

class _VoiceAssessmentScreenState
    extends State<VoiceAssessmentScreen> {
  bool isRecording = false;
  bool recordingCompleted = false;

  void toggleRecording() {
    setState(() {
      isRecording = !isRecording;

      if (!isRecording) {
        recordingCompleted = true;
      }
    });
  }

  void continueToHandwriting() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const HandwritingAssessmentScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Voice Assessment'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 30),

            const Icon(
              Icons.mic_none_rounded,
              size: 90,
            ),

            const SizedBox(height: 24),

            const Text(
              'Voice Assessment',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            Text(
              'Record a short voice sample. Speak clearly for '
              'approximately 10–15 seconds.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),

            const SizedBox(height: 45),

            GestureDetector(
              onTap: toggleRecording,
              child: CircleAvatar(
                radius: 42,
                child: Icon(
                  isRecording ? Icons.stop : Icons.mic,
                  size: 38,
                ),
              ),
            ),

            const SizedBox(height: 20),

            Text(
              isRecording
                  ? 'Recording... Tap to stop'
                  : recordingCompleted
                      ? 'Recording completed'
                      : 'Tap the microphone to start',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),

            const Spacer(),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed:
                    recordingCompleted ? continueToHandwriting : null,
                child: const Text('Continue'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}


// ------------------------------------------------------------
// HANDWRITING ASSESSMENT
// ------------------------------------------------------------

class HandwritingAssessmentScreen extends StatelessWidget {
  const HandwritingAssessmentScreen({super.key});

  void continueToGait(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const GaitAssessmentScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Handwriting Assessment'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 25),

            const Icon(
              Icons.edit_outlined,
              size: 85,
            ),

            const SizedBox(height: 24),

            const Text(
              'Handwriting Assessment',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            Text(
              'Provide a clear handwriting sample. The sample '
              'will be analyzed for relevant motor patterns.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),

            const SizedBox(height: 30),

            Container(
              height: 180,
              width: double.infinity,
              decoration: BoxDecoration(
                border: Border.all(
                  color: Colors.grey.shade400,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.upload_file_outlined,
                      size: 45,
                    ),
                    SizedBox(height: 12),
                    Text('Upload handwriting sample'),
                    SizedBox(height: 5),
                    Text(
                      'JPG or PNG',
                      style: TextStyle(
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: () {
                  // Image picker will be connected here next.
                },
                icon: const Icon(Icons.image_outlined),
                label: const Text('Choose Image'),
              ),
            ),

            const Spacer(),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: () => continueToGait(context),
                child: const Text('Continue to Gait Assessment'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}


// ------------------------------------------------------------
// GAIT ASSESSMENT
// ------------------------------------------------------------

class GaitAssessmentScreen extends StatelessWidget {
  const GaitAssessmentScreen({super.key});

  void showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Video recording/upload will be connected next.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gait Assessment'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 25),

            const Icon(
              Icons.directions_walk_rounded,
              size: 85,
            ),

            const SizedBox(height: 24),

            const Text(
              'Gait Assessment',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            Text(
              'Record or upload a short walking video. '
              'Make sure your full body is visible while walking.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),

            const SizedBox(height: 35),

            Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: Icon(
                  Icons.video_camera_back_outlined,
                  size: 70,
                ),
              ),
            ),

            const SizedBox(height: 20),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => showComingSoon(context),
                    icon: const Icon(Icons.videocam_outlined),
                    label: const Text('Record'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => showComingSoon(context),
                    icon: const Icon(Icons.upload_file_outlined),
                    label: const Text('Upload'),
                  ),
                ),
              ],
            ),

            const Spacer(),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const ScreeningResultScreen(),
                    ),
                  );
                },
                child: const Text('View Screening Result'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}


// ------------------------------------------------------------
// RESULT SCREEN
// ------------------------------------------------------------

class ScreeningResultScreen extends StatelessWidget {
  const ScreeningResultScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Screening Result'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 20),

            const Icon(
              Icons.analytics_outlined,
              size: 80,
            ),

            const SizedBox(height: 20),

            const Text(
              'Screening Result',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 10),

            Text(
              'Your assessment results will appear here after '
              'the AI models analyze all three inputs.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),

            const SizedBox(height: 30),

            _ResultCard(
              icon: Icons.mic_none_rounded,
              title: 'Voice Analysis',
              result: 'Pending AI analysis',
            ),

            _ResultCard(
              icon: Icons.edit_outlined,
              title: 'Handwriting Analysis',
              result: 'Pending AI analysis',
            ),

            _ResultCard(
              icon: Icons.directions_walk_rounded,
              title: 'Gait Analysis',
              result: 'Pending AI analysis',
            ),

            const SizedBox(height: 20),

            const Text(
              'Note: This result is intended for preliminary '
              'screening and is not a medical diagnosis.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String result;

  const _ResultCard({
    required this.icon,
    required this.title,
    required this.result,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(icon, size: 30),
        title: Text(title),
        subtitle: Text(result),
      ),
    );
  }
}